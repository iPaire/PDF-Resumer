import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';


export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: 'Nu există cont asociat acestui email' },
        { status: 404 }
      );
    }

    // Generează un token de 6 cifre
    const token = generateToken(6);
    const expires = new Date(Date.now() + 15 * 60 * 1000); // Expiră în 15 minute

    // Salvează token-ul în baza de date
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expires
      }
    });

    // Trimite email cu token-ul
    try {
      await sendPasswordResetEmail({ to: email, token });
      console.log(`Email de resetare parolă trimis cu succes la ${email}`);
    } catch (emailError) {
      console.error('Eroare la trimiterea email-ului:', emailError);
      // Fallback - afișează token-ul în consolă dacă email-ul nu poate fi trimis
      console.log(`Token resetare parolă pentru ${email}: ${token}`);
      return NextResponse.json({
        message: 'Token generat (check console - email service not configured)'
      });
    }

    return NextResponse.json({
      message: 'Token trimis cu succes'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Eroare la trimiterea token-ului' },
      { status: 500 }
    );
  }
}