// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  
  if (!courseId) {
    return NextResponse.json(
      { error: 'ID-ul cursului lipsește' },
      { status: 400 }
    );
  }

  try {
    // Găsește cursul împreună cu relațiile sale
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        userId: session.user.id 
      },
      include: {
        files: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        },
        summaries: {
          select: {
            id: true,
            title: true,
            createdAt: true
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Cursul nu a fost găsit sau nu aveți permisiune' },
        { status: 404 }
      );
    }

    return NextResponse.json(course);
    
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Eroare server la preluarea cursului' },
      { status: 500 }
    );
  }
}