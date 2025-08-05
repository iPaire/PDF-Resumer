// app/api/courses/[id]/summaries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  
  if (!courseId) {
    return NextResponse.json(
      { error: 'ID-ul cursului lipsește' },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  
  try {
    const { summaryIds } = await req.json();
    
    if (!Array.isArray(summaryIds)) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

    // Verifică cursul
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        userId: userId
      },
      include: {
        summaries: {
          select: { id: true }
        }
      }
    });
    
    if (!course) {
      return NextResponse.json(
        { error: 'Cursul nu a fost găsit sau nu aveți permisiune' },
        { status: 404 }
      );
    }
    
    // Găsește rezumatele noi
    const existingSummaryIds = course.summaries.map(s => s.id);
    const newSummaryIds = summaryIds.filter(id => !existingSummaryIds.includes(id));
    
    if (newSummaryIds.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'Nicio modificare necesară' 
      });
    }
    
    // Verifică rezumatele în baza de date
    const summaries = await prisma.summary.findMany({
      where: { 
        id: { in: newSummaryIds },
        userId: userId
      }
    });
    
    const foundIds = summaries.map(s => s.id);
    const missingIds = newSummaryIds.filter(id => !foundIds.includes(id));
    
    if (missingIds.length > 0) {
      return NextResponse.json({ 
        error: 'Unele rezumate nu există sau nu vă aparțin',
        missingIds
      }, { status: 404 });
    }
    
    // Actualizează relațiile
    await prisma.course.update({
      where: { id: courseId },
      data: {
        summaries: {
          connect: foundIds.map(id => ({ id }))
        }
      }
    });
    
    return NextResponse.json({ 
      success: true,
      addedCount: foundIds.length
    });
    
  } catch (error) {
    console.error('Error updating course summaries:', error);
    return NextResponse.json(
      { error: 'Eroare server la actualizarea rezumatelor' },
      { status: 500 }
    );
  }
}