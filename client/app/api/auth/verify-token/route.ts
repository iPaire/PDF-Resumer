import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkResetRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json();

    // Throttle guesses per IP and per account - this is the primary control
    // against brute-forcing the reset code.
    const rateLimit = await checkResetRateLimit(request, email);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit, 'Prea multe încercări. Încearcă din nou mai târziu.') as NextResponse;
    }

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