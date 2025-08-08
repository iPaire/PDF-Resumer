// app/api/summaries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const summaryId = context.params.id;
  const userId = session.user.id;

  try {
    console.log('Fetching summary:', summaryId, 'for user:', userId);

    // Obține rezumatul cu verificarea că aparține utilizatorului
    const summary = await prisma.summary.findFirst({
      where: { 
        id: summaryId,
        userId: userId // Verifică că rezumatul aparține utilizatorului
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
      }
    });

    if (!summary) {
      return NextResponse.json({ 
        error: "Rezumatul nu a fost găsit sau nu ai permisiunea să îl vizualizezi" 
      }, { status: 404 });
    }

    // Formatează răspunsul pentru frontend
    const formattedSummary = {
      id: summary.id,
      title: summary.title,
      content: summary.content,
      createdAt: summary.createdAt,
      userId: summary.userId,
      coursesCount: summary.courses.length,
      courses: summary.courses.map(cs => ({
        id: cs.course.id,
        title: cs.course.title
      })),
      // Pentru compatibilitate cu codul vechi
      name: summary.title,
      summary: summary.content
    };

    console.log('Summary found and formatted');
    return NextResponse.json(formattedSummary);

  } catch (error) {
    console.error("Failed to fetch summary:", error);
    return NextResponse.json({ 
      error: "Eroare server la obținerea rezumatului" 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const summaryId = params.id;
  const userId = session.user.id;

  try {
    console.log('Attempting to delete summary:', summaryId, 'for user:', userId);

    // Verifică că rezumatul există și aparține utilizatorului
    const summary = await prisma.summary.findFirst({
      where: { 
        id: summaryId,
        userId: userId
      }
    });

    if (!summary) {
      return NextResponse.json({ 
        error: 'Rezumatul nu a fost găsit sau nu ai permisiunea să îl ștergi' 
      }, { status: 404 });
    }

    // Șterge asocierile cu cursurile mai întâi (dacă există)
    await prisma.courseSummary.deleteMany({
      where: { summaryId: summaryId }
    });

    // Apoi șterge rezumatul
    await prisma.summary.delete({
      where: { id: summaryId }
    });

    console.log('Summary deleted successfully:', summaryId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Eroare ștergere rezumat:', error);
    return NextResponse.json({ 
      error: 'Eroare server la ștergerea rezumatului' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const summaryId = params.id;
  const userId = session.user.id;

  try {
    const { courseId, title, content } = await request.json();

    // Verifică că rezumatul există și aparține utilizatorului
    const summary = await prisma.summary.findFirst({
      where: { 
        id: summaryId,
        userId: userId
      }
    });

    if (!summary) {
      return NextResponse.json({ 
        error: 'Rezumatul nu a fost găsit sau nu ai permisiunea să îl modifici' 
      }, { status: 404 });
    }

    // Dacă se actualizează cursul
    if (courseId !== undefined) {
      // Șterge asocierile existente
      await prisma.courseSummary.deleteMany({
        where: { summaryId: summaryId }
      });

      // Adaugă noua asociere dacă courseId nu este null
      if (courseId) {
        // Verifică că cursul aparține utilizatorului
        const course = await prisma.course.findFirst({
          where: { 
            id: courseId,
            userId: userId
          }
        });

        if (!course) {
          return NextResponse.json({ 
            error: 'Cursul nu a fost găsit sau nu ai permisiunea să îl folosești' 
          }, { status: 404 });
        }

        await prisma.courseSummary.create({
          data: {
            courseId: courseId,
            summaryId: summaryId
          }
        });
      }
    }

    // Actualizează rezumatul dacă sunt furnizate title sau content
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    if (Object.keys(updateData).length > 0) {
      await prisma.summary.update({
        where: { id: summaryId },
        data: updateData
      });
    }

    console.log('Summary updated successfully:', summaryId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Eroare actualizare rezumat:', error);
    return NextResponse.json({ 
      error: 'Eroare server la actualizarea rezumatului' 
    }, { status: 500 });
  }
}