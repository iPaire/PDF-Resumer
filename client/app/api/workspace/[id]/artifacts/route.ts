// app/api/workspace/[id]/artifacts/route.ts - On-demand generation and
// retrieval of learning workspace artifacts (concepts, flashcards, questions,
// notes, quiz) for a summary. [id] is the Summary id.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
  isArtifactType,
  canUseFeature,
  canRegenerate,
  artifactSizes,
  type ArtifactType,
} from '@/lib/workspace-access';
import {
  buildDocContext,
  generateKeyConcepts,
  generateFlashcards,
  generateImportantQuestions,
  generateStudyNotes,
  generateWorkspaceQuiz,
  type DocContext,
} from '@/lib/ai-workspace';

export const maxDuration = 60;

async function loadOwnedSummary(summaryId: string, userId: string) {
  return prisma.summary.findFirst({
    where: { id: summaryId, userId },
    include: {
      file: { select: { extractedText: true } },
    },
  });
}

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

  const artifacts = await prisma.workspaceArtifact.findMany({
    where: { summaryId: id },
    select: { type: true, content: true, language: true, updatedAt: true },
  });

  return NextResponse.json({ artifacts });
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

  let body: { type?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const type = body.type;
  if (!type || !isArtifactType(type)) {
    return NextResponse.json({ error: 'Invalid artifact type' }, { status: 400 });
  }

  const plan = session.user.subscription || 'free';
  if (!canUseFeature(plan, type)) {
    return NextResponse.json({ error: 'Feature not available on your plan', upgrade: true }, { status: 403 });
  }

  const summary = await loadOwnedSummary(id, session.user.id);
  if (!summary) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Idempotent: return the stored artifact unless a paid user forces a redo.
  const existing = await prisma.workspaceArtifact.findUnique({
    where: { summaryId_type: { summaryId: id, type } },
  });
  if (existing && !(body.force && canRegenerate(plan))) {
    return NextResponse.json({ type, content: existing.content, cached: true });
  }

  const ctx = buildDocContext(summary.file?.extractedText, summary.content, summary.language);
  const sizes = artifactSizes(plan);

  try {
    const content = await generateArtifact(type, ctx, sizes);
    // Record whether generation used the full document or only the summary,
    // so the UI can note degraded quality for legacy documents.
    const stored = { ...content, source: ctx.source } as object;

    await prisma.workspaceArtifact.upsert({
      where: { summaryId_type: { summaryId: id, type } },
      create: {
        summaryId: id,
        userId: session.user.id,
        type,
        content: stored,
        language: summary.language,
      },
      update: { content: stored, updatedAt: new Date() },
    });

    return NextResponse.json({ type, content: stored });
  } catch (error) {
    console.error(`[workspace] ${type} generation failed for summary ${id}:`, error);
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 502 });
  }
}

function generateArtifact(
  type: ArtifactType,
  ctx: DocContext,
  sizes: ReturnType<typeof artifactSizes>
) {
  switch (type) {
    case 'concepts':
      return generateKeyConcepts(ctx, sizes.concepts);
    case 'flashcards':
      return generateFlashcards(ctx, sizes.flashcards);
    case 'questions':
      return generateImportantQuestions(ctx, sizes.questions);
    case 'notes':
      return generateStudyNotes(ctx);
    case 'quiz':
      return generateWorkspaceQuiz(ctx, sizes.quiz);
  }
}
