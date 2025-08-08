import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

// POST - Generează rezumatul final al cursului
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    // Verifică cursul și obține toate rezumatele
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
        userId: userId
      },
      include: {
        summaries: {
          include: {
            summary: {
              select: {
                id: true,
                title: true,
                content: true
              }
            }
          },
          orderBy: {
            addedAt: 'asc' // Ordonează cronologic pentru context
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Cursul nu a fost găsit' },
        { status: 404 }
      );
    }

    if (course.summaries.length === 0) {
      return NextResponse.json(
        { error: 'Cursul nu conține rezumate' },
        { status: 400 }
      );
    }

    // Combină toate rezumatele
    const allSummaries = course.summaries.map(cs => ({
      title: cs.summary.title,
      content: cs.summary.content
    }));

    // Creează textul combinat pentru procesare AI
    const combinedText = allSummaries.map((summary, index) => 
      `## Rezumat ${index + 1}: ${summary.title}\n\n${summary.content}`
    ).join('\n\n---\n\n');

    // Generează rezumatul final
    const finalSummaryContent = await generateCourseFinalSummary(
      course.title, 
      course.description || '', 
      combinedText
    );

    // Salvează rezumatul final ca un nou Summary
    const finalSummary = await prisma.summary.create({
      data: {
        title: `Rezumat Final - ${course.title}`,
        content: finalSummaryContent,
        userId: userId
      }
    });

    // Adaugă rezumatul final la curs
    await prisma.courseSummary.create({
      data: {
        courseId: courseId,
        summaryId: finalSummary.id
      }
    });

    return NextResponse.json({
      success: true,
      finalSummary: {
        id: finalSummary.id,
        title: finalSummary.title,
        content: finalSummary.content,
        createdAt: finalSummary.createdAt
      },
      sourceCount: allSummaries.length
    });

  } catch (error) {
    console.error('Error generating final summary:', error);
    return NextResponse.json(
      { error: 'Eroare server la generarea rezumatului final' },
      { status: 500 }
    );
  }
}

// GET - Obține rezumatul final dacă există
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    // Caută un rezumat final pentru acest curs
    const finalSummaryRelation = await prisma.courseSummary.findFirst({
      where: {
        courseId: courseId,
        summary: {
          title: {
            startsWith: 'Rezumat Final -'
          },
          userId: userId
        }
      },
      include: {
        summary: true
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    if (!finalSummaryRelation) {
      return NextResponse.json(
        { error: 'Nu există rezumat final pentru acest curs' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      finalSummary: {
        id: finalSummaryRelation.summary.id,
        title: finalSummaryRelation.summary.title,
        content: finalSummaryRelation.summary.content,
        createdAt: finalSummaryRelation.summary.createdAt,
        addedAt: finalSummaryRelation.addedAt
      }
    });

  } catch (error) {
    console.error('Error fetching final summary:', error);
    return NextResponse.json(
      { error: 'Eroare server' },
      { status: 500 }
    );
  }
}

// Funcție helper pentru generarea rezumatului final
async function generateCourseFinalSummary(
  courseTitle: string, 
  courseDescription: string, 
  combinedSummaries: string
): Promise<string> {
  // Pentru demonstrație, returnez un rezumat generic
  return `# Rezumat Final - ${courseTitle}

## Introducere
Acest curs acoperă conceptele fundamentale prezentate în ${combinedSummaries.split('---').length} module distincte.

## Concepte Cheie
${extractKeyPoints(combinedSummaries)}

## Concluzie
Materialele studiate oferă o perspectivă comprehensivă asupra subiectului abordat.

---
*Rezumat generat automat pe ${new Date().toLocaleDateString('ro-RO')}*
`;
}

// Funcție helper pentru extragerea punctelor cheie
function extractKeyPoints(text: string): string {
  const sections = text.split('---');
  const keyPoints = [];
  
  sections.forEach((section, index) => {
    const lines = section.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 2) {
      keyPoints.push(`**Modul ${index + 1}**: ${lines[1]?.replace(/^#+\s*/, '') || 'Concepte importante'}`);
    }
  });
  
  return keyPoints.join('\n\n');
}