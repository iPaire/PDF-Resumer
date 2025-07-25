import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { combineSummaries, generateAIResponse } from '@/lib/ai'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const courseId = req.query.id as string

  if (req.method === 'POST') {
    try {
      // Get course with summaries
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: { summaries: true }
      })

      if (!course) {
        return res.status(404).json({ error: 'Course not found' })
      }

      // Combine all summaries into one text
      const combinedContent = combineSummaries(course.summaries)

      // Generate quiz using AI
      const aiResponse = await generateAIResponse(
        `Generează un quiz cu 10 întrebări pentru întregul curs bazat pe următoarele rezumate. 
         Formatează răspunsul ca un array JSON de obiecte cu structura:
         [{ "question": "Întrebare", "options": ["Opțiune1", "Opțiune2", "Opțiune3", "Opțiune4"], "correct": 0 }]
         \n\n${combinedContent}`
      )

      // Parse the AI response
      let quizData;
      try {
        quizData = JSON.parse(aiResponse);
      } catch (error) {
        console.error('Error parsing quiz JSON:', error);
        return res.status(500).json({ error: 'Failed to parse quiz data' });
      }

      // Save the generated quiz to the course
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { quiz: quizData }
      })

      return res.status(200).json({ quiz: updatedCourse.quiz })
    } catch (error) {
      console.error('Error generating quiz:', error)
      return res.status(500).json({ error: 'Failed to generate quiz' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}