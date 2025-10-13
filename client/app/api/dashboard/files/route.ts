// app/api/dashboard/files/route.ts
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Obține rezumate și quiz-uri din tabelele noi
    const [summaries, quizzes] = await Promise.all([
      prisma.summary.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          title: true,
          createdAt: true,
        }
      }),
      prisma.quiz.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          course: {
            select: {
              title: true
            }
          }
        }
      })
    ]);

    // Combinăm și sortăm după dată
    const activities = [
      ...summaries.map(summary => ({
        id: summary.id,
        name: summary.title,
        date: summary.createdAt.toISOString().split('T')[0],
        type: 'summary',
        status: 'Procesat'
      })),
      ...quizzes.map(quiz => ({
        id: quiz.id,
        name: `Quiz - ${quiz.course.title}`,
        date: quiz.createdAt.toISOString().split('T')[0],
        type: 'quiz',
        status: 'Procesat'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 5);

    return new Response(JSON.stringify(activities), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error fetching dashboard activities:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Helper function to format file size
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}