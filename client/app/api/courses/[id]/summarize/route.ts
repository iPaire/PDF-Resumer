import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
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

      // Generate full course summary using AI
      const aiResponse = await generateAIResponse(
        `Creează un rezumat detaliat al întregului curs bazat pe următoarele rezumate individuale:\n\n${combinedContent}`
      )

      // Save the generated summary to the course
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { fullSummary: aiResponse }
      })

      return res.status(200).json({ summary: updatedCourse.fullSummary })
    } catch (error) {
      console.error('Error generating course summary:', error)
      return res.status(500).json({ error: 'Failed to generate summary' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}