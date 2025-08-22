import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { rating, comment, feedback } = await req.json();
    
    // Handle general feedback from contact page (no authentication required)
    if (feedback && !rating) {
      if (typeof feedback !== 'string' || feedback.trim().length === 0) {
        return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
      }
      
      // Store general feedback in database
      const generalFeedback = await prisma.feedback.create({
        data: {
          comment: feedback.trim(),
          rating: null, // No rating for general feedback
          userId: session?.user?.id || null, // Optional user association
        },
      });
      
      return NextResponse.json({ message: 'Feedback submitted successfully' }, { status: 201 });
    }
    
    // Handle rating-based feedback (requires authentication)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }
    
    const ratingFeedback = await prisma.feedback.create({
      data: {
        rating,
        comment: comment || '',
        userId: session.user.id,
      },
    });
    
    return NextResponse.json(ratingFeedback, { status: 201 });
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}