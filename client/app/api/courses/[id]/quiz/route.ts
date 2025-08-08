import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { generateAIResponse } from '@/lib/ai';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    // Get course with summaries
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        userId: userId 
      },
      include: { 
        summaries: {
          include: {
            summary: true
          }
        } 
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Combine all summaries into one text
    const combinedContent = course.summaries
      .map(cs => `## ${cs.summary.title}\n\n${cs.summary.content}`)
      .join('\n\n---\n\n');

    // Generate quiz using AI
    const aiResponse = await generateAIResponse(
      `Generează un quiz cu 10 întrebări pentru întregul curs bazat pe următoarele rezumate. 
       Formatează răspunsul ca un array JSON de obiecte cu structura:
       [{ "question": "Întrebare", "options": ["Opțiune1", "Opțiune2", "Opțiune3", "Opțiune4"], "correct": 0 }]
       \n\n${combinedContent}`
    );

    // Parse the AI response
    let quizData;
    try {
      quizData = JSON.parse(aiResponse);
    } catch (error) {
      console.error('Error parsing quiz JSON:', error);
      return NextResponse.json({ error: 'Failed to parse quiz data' }, { status: 500 });
    }

    // Save the generated quiz to the course
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { quiz: quizData }
    });

    return NextResponse.json({ quiz: updatedCourse.quiz });

  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}