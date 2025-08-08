// app/api/summaries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

// GET - Obține toate rezumatele utilizatorului
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    console.log('Fetching summaries for user:', userId);

    // Obține toate rezumatele utilizatorului cu informații despre cursurile asociate
    const summaries = await prisma.summary.findMany({
      where: {
        userId: userId
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('Found summaries:', summaries.length);

    // Formatează datele pentru frontend
    const formattedSummaries = summaries.map(summary => ({
      id: summary.id,
      title: summary.title,
      content: summary.content,
      createdAt: summary.createdAt,
      coursesCount: summary.courses.length,
      courses: summary.courses.map(cs => ({
        id: cs.course.id,
        title: cs.course.title
      }))
    }));

    return NextResponse.json({
      summaries: formattedSummaries,
      total: summaries.length
    });

  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json(
      { error: 'Eroare server la obținerea rezumatelor' },
      { status: 500 }
    );
  }
}

// POST - Creează un rezumat nou
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { title, content } = await req.json();

    // Validări
    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Titlul este obligatoriu' }, { status: 400 });
    }

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Conținutul este obligatoriu' }, { status: 400 });
    }

    // Creează rezumatul
    const newSummary = await prisma.summary.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        userId: userId
      }
    });

    console.log('Created new summary:', newSummary.id);

    return NextResponse.json({
      success: true,
      summary: {
        id: newSummary.id,
        title: newSummary.title,
        content: newSummary.content,
        createdAt: newSummary.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating summary:', error);
    return NextResponse.json(
      { error: 'Eroare server la crearea rezumatului' },
      { status: 500 }
    );
  }
}