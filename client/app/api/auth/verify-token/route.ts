import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json();
    
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Utilizatorul nu există' },
        { status: 404 }
      );
    }
    
    const validToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token,
        expires: { gt: new Date() }
      }
    });
    
    if (!validToken) {
      return NextResponse.json(
        { error: 'Token invalid sau expirat' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Token valid' 
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Eroare la verificarea token-ului' },
      { status: 500 }
    );
  }
}