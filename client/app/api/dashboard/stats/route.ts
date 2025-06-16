// app/api/dashboard/stats/route.ts
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"
import { Prisma } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const [filesProcessed, summariesCreated, quizzesGenerated] = await Promise.all([
      prisma.file.count({
        where: { userId: session.user.id }
      }),
      prisma.usage.count({
        where: { 
          userId: session.user.id,
          date: { 
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          } 
        }
      }),
      prisma.file.count({
        where: { 
          userId: session.user.id,
          quiz: { not: Prisma.DbNull } // Corectie importantă aici
        }
      })
    ]);

    // Calculate storage used (mock calculation)
    const files = await prisma.file.findMany({
      where: { userId: session.user.id },
      select: { size: true }
    });
    
    const totalSize = files.reduce((sum: number, file) => sum + file.size, 0);
    const storageUsed = Math.min(100, Math.round((totalSize / (10 * 1024 * 1024)) * 100)) + '%';

    return new Response(JSON.stringify({ 
      filesProcessed,
      summariesCreated,
      quizzesGenerated,
      storageUsed
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}