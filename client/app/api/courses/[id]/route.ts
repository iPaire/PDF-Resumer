import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const courseId = params.id

  try {
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        userId: session.user.id 
      },
      include: {
        summaries: {
          select: {
            id: true,
            createdAt: true,
            content: true
          }
        },
        files: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const courseId = params.id

  try {
    // Disassociate files and summaries from this course
    await Promise.all([
      prisma.file.updateMany({
        where: { courseId },
        data: { courseId: null }
      }),
      prisma.summary.updateMany({
        where: { courseId },
        data: { courseId: null }
      })
    ])

    // Delete the course
    await prisma.course.delete({
      where: { 
        id: courseId,
        userId: session.user.id 
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Added POST method for creating summaries
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const courseId = params.id
  const { content } = await req.json()

  try {
    const summary = await prisma.summary.create({
      data: {
        content,
        courseId,
        userId: session.user.id
      }
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error creating summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}