//app/api/dashboard/stats/route.ts
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
    // Get user with subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        subscription: true,
        tokens: true
      }
    });
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Calculate storage limit based on subscription
    let storageLimitBytes: number;
    switch (user.subscription) {
      case 'premium'  :
        storageLimitBytes = 1024 * 1024 * 1024; // 1 GB
        break;
      case 'standard':
        storageLimitBytes = 250 * 1024 * 1024; // 250 MB
        break;
      case 'trial':
        storageLimitBytes = 100 * 1024 * 1024; // 100 MB
        break;
      default: // free
        storageLimitBytes = 15 * 1024 * 1024; // 15 MB
    }

    // Get all files for the user
    const files = await prisma.file.findMany({
      where: { userId: session.user.id }
    });
    
    // Calculate total storage used
    const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
    
    // Calculate storage percentage used
    const storagePercentage = Math.min(
      Math.round((totalSizeBytes / storageLimitBytes) * 100),
      100  // Cap at 100% even if over limit
    );
    
    // Count summaries from both old File table and new Summary table
    const oldSummariesCount = files.filter(file =>
      file.summary && file.summary.trim() !== ''
    ).length;
    const newSummariesCount = await prisma.summary.count({
      where: { userId: session.user.id }
    });
    const summariesCreated = oldSummariesCount + newSummariesCount;

    // Count quizzes from both old File table and new Quiz table
    const oldQuizzesCount = files.filter(file =>
      file.quiz !== null && Object.keys(file.quiz).length > 0
    ).length;
    const newQuizzesCount = await prisma.quiz.count({
      where: { userId: session.user.id }
    });
    const quizzesGenerated = oldQuizzesCount + newQuizzesCount;

    // Count courses
    const coursesCreated = await prisma.course.count({
      where: { userId: session.user.id }
    });
    
    // Format file size function
    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return new Response(JSON.stringify({ 
      filesProcessed: files.length,
      summariesCreated,
      quizzesGenerated,
      coursesCreated,
      tokens: user.tokens || 0,
      storageUsed: formatFileSize(totalSizeBytes),
      storageLimit: formatFileSize(storageLimitBytes),
      storagePercentage,
      storageUsedBytes: totalSizeBytes,
      storageLimitBytes
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error fetching stats:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}