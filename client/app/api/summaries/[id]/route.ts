import { NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const fileId = params.id;

  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Neautorizat' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        size: true,
        pages: true,
        characters: true,
        summary: true,
        userId: true
      }
    });

    if (!file) {
      return new Response(JSON.stringify({ error: 'Rezumatul nu a fost găsit' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (file.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Nu ai acces la acest rezumat' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Formatare răspuns
    const responseData = {
      id: file.id,
      name: file.name,
      createdAt: file.createdAt.toISOString(),
      size: formatFileSize(file.size),
      pages: file.pages,
      characters: file.characters,
      summary: file.summary
    };

    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Eroare API:', error);
    return new Response(JSON.stringify({ error: 'Eroare server' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Funcție helper pentru formatarea dimensiunii fișierului
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}