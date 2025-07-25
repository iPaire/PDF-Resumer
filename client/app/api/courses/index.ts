import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'
import { authOptions } from '@/api/auth/[...nextauth]/route'


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // GET - Listă cursuri
  if (req.method === 'GET') {
    try {
      const courses = await prisma.course.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST - Creare curs nou
  if (req.method === 'POST') {
    const { title } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Invalid title' });
    }

    try {
      const newCourse = await prisma.course.create({
        data: {
          title: title.trim(),
          userId: session.user.id
        }
      });
      return res.status(201).json(newCourse);
    } catch (error) {
      console.error('Error creating course:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}