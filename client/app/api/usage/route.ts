import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"

// Define file size limits in MB
const FILE_SIZE_LIMITS_MB = {
  free: 10,
  trial: 25,
  standard: 50,
  premium: 50
};

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        usage: { 
          where: { 
            date: { 
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            } 
          } 
        } 
      }
    })

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const usageCount = user.usage.length;
    const planLimits = {
      free: 3,
      trial: 25,
      standard: 50,
      premium: 50
    };
    
    // Get user's file size limit in MB
    const fileSizeLimit = FILE_SIZE_LIMITS_MB[user.subscription as keyof typeof FILE_SIZE_LIMITS_MB] || 10;
    
    return new Response(JSON.stringify({ 
      used: usageCount, 
      limit: planLimits[user.subscription as keyof typeof planLimits] || 0,
      fileSizeLimit: fileSizeLimit
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