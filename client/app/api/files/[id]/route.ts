// app/api/files/[id]/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const fileId = params.id;

  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file || file.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'File not found or access denied' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create a JSON file with the summary
    const jsonContent = JSON.stringify({
      fileName: file.name,
      summary: file.summary,
      createdAt: file.createdAt
    }, null, 2);

    return new Response(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '')}_summary.json"`
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}