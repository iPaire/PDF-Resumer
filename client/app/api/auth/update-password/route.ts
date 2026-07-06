import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { checkResetRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { email, token, password } = await request.json();

    // This endpoint re-verifies the token and sets the password, so it is
    // directly brute-forceable on its own - throttle it the same way.
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
    
    // Verifică din nou token-ul pentru securitate
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
    
    // Actualizează parola
    const hashedPassword = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    // Șterge token-ul folosit
    await prisma.passwordResetToken.delete({
      where: { id: validToken.id }
    });
    
    return NextResponse.json({ 
      message: 'Parolă actualizată cu succes' 
    });
    
  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json(
      { error: 'Eroare la actualizarea parolei' },
      { status: 500 }
    );
  }
}