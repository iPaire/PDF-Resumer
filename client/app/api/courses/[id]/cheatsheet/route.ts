import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
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

      // Generate cheat sheet using AI
      const aiResponse = await generateAIResponse(
        `Creează un cheat sheet (fișă de sinteză) pentru întregul curs bazat pe următoarele rezumate individuale. 
         Include doar cele mai importante concepte, formule, și definiții într-un format concis și organizat:\n\n${combinedContent}`
      )

      // Save the generated cheat sheet to the course
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { cheatSheet: aiResponse }
      })

      return res.status(200).json({ cheatSheet: updatedCourse.cheatSheet })
    } catch (error) {
      console.error('Error generating cheat sheet:', error)
      return res.status(500).json({ error: 'Failed to generate cheat sheet' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}