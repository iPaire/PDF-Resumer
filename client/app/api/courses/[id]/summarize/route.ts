import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { generateAIResponse } from '@/lib/ai'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const courseId = params.id

  try {
    // Obținem cursul cu toate rezumatele asociate
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        userId: session.user.id 
      },
      include: { 
        summaries: true 
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Combinăm toate rezumatele într-un singur text
    const combinedContent = course.summaries
      .map(s => `## ${new Date(s.createdAt).toLocaleDateString('ro-RO')}\n\n${s.content}`)
      .join('\n\n')

    // Generăm rezumatul complet folosind AI
    const aiResponse = await generateAIResponse(
      `Creează un rezumat detaliat și coerent al întregului curs bazat pe următoarele rezumate individuale. 
      Rezumatul final trebuie să fie bine structurat și să acopere toate subiectele importante:\n\n${combinedContent}`
    )

    // Actualizăm cursul cu noul rezumat complet
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { fullSummary: aiResponse }
    })

    return NextResponse.json({ summary: updatedCourse.fullSummary })
  } catch (error) {
    console.error('Error generating course summary:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}