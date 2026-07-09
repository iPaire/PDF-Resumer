// app/workspace/[id]/page.tsx - Learning workspace for a single document.
// Server component: loads the summary (owner-scoped) plus lightweight
// metadata. extractedText is never selected here - it stays server-side and
// is only read by the generation/chat API routes.
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import WorkspaceShell, { WorkspaceData } from '@/components/workspace/WorkspaceShell';

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const summary = await prisma.summary.findFirst({
    where: { id, userId: session.user.id },
    include: {
      file: {
        select: { id: true, name: true, pages: true, characters: true, quiz: true, language: true },
      },
      artifacts: {
        select: { type: true, updatedAt: true },
      },
      _count: { select: { chatMessages: true } },
    },
  });

  if (!summary) {
    redirect('/summaries');
  }

  // Whether full document text exists (legacy rows predate text persistence).
  const hasDocumentText = summary.fileId
    ? (await prisma.file.count({
        where: { id: summary.fileId, extractedText: { not: null } },
      })) > 0
    : false;

  const data: WorkspaceData = {
    id: summary.id,
    title: summary.title,
    content: summary.content,
    language: summary.language,
    createdAt: summary.createdAt.toISOString(),
    fileName: summary.file?.name ?? null,
    pages: summary.file?.pages ?? null,
    uploadQuiz: (summary.file?.quiz as any) ?? null,
    hasDocumentText,
    artifacts: summary.artifacts.map((a) => ({ type: a.type, updatedAt: a.updatedAt.toISOString() })),
    chatCount: summary._count.chatMessages,
    plan: session.user.subscription || 'free',
  };

  return <WorkspaceShell data={data} />;
}
