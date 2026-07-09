// app/api/workspace/[id]/chat/route.ts - Chat with the document.
// GET returns persisted history; POST streams a tutor answer grounded in the
// document text (or the summary for legacy documents without stored text).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { chatMessageLimit } from '@/lib/workspace-access';
import { buildDocContext } from '@/lib/ai-workspace';
import { createChatCompletionStream, type ChatMessageTurn } from '@/lib/ai-client';

export const maxDuration = 60;

const CHAT_MODEL = 'gpt-4o-mini';
const CHAT_CONTEXT_CHARS = 16_000;
const MAX_MESSAGE_CHARS = 2_000;
const HISTORY_TURNS = 10;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ro: 'Romanian',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await prisma.summary.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!summary) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { summaryId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = await checkRateLimit('ai', session.user.id);
  if (!rate.success) {
    return rateLimitResponse(rate);
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const message = (body.message || '').trim();
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'Message must be 1-2000 characters' }, { status: 400 });
  }

  const summary = await prisma.summary.findFirst({
    where: { id, userId: session.user.id },
    include: { file: { select: { extractedText: true } } },
  });
  if (!summary) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Free-plan cap on user messages per document.
  const plan = session.user.subscription || 'free';
  const limit = chatMessageLimit(plan);
  if (Number.isFinite(limit)) {
    const used = await prisma.chatMessage.count({
      where: { summaryId: id, role: 'user' },
    });
    if (used >= limit) {
      return NextResponse.json(
        { error: 'Free chat limit reached for this document', upgrade: true },
        { status: 403 }
      );
    }
  }

  const history = await prisma.chatMessage.findMany({
    where: { summaryId: id },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_TURNS,
    select: { role: true, content: true },
  });
  const turns: ChatMessageTurn[] = history
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  await prisma.chatMessage.create({
    data: { summaryId: id, userId: session.user.id, role: 'user', content: message },
  });

  const ctx = buildDocContext(
    summary.file?.extractedText,
    summary.content,
    summary.language,
    CHAT_CONTEXT_CHARS
  );
  const language = LANGUAGE_NAMES[summary.language] || 'English';

  const system =
    `You are a friendly, patient personal tutor helping a student understand a document titled "${summary.title}". ` +
    `Answer in ${language} unless the student asks otherwise. Be clear and concise; use short paragraphs, ` +
    `bullet points and examples. If the answer is not in the document, say so explicitly, then answer from ` +
    `general knowledge with that caveat.\n\n` +
    `Document content${ctx.source === 'summary' ? ' (summary only)' : ''}:\n"""\n${ctx.text}\n"""`;

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = '';
      try {
        for await (const chunk of createChatCompletionStream({
          model: CHAT_MODEL,
          system,
          prompt: message,
          messages: turns,
          maxTokens: 1200,
          temperature: 0.5,
        })) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        console.error(`[workspace] chat stream failed for summary ${id}:`, error);
        controller.error(error);
        return;
      }

      // Persist the assistant turn after the stream completes.
      if (full.trim()) {
        try {
          await prisma.chatMessage.create({
            data: { summaryId: id, userId, role: 'assistant', content: full },
          });
        } catch (error) {
          console.error('[workspace] failed to persist assistant message:', error);
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
