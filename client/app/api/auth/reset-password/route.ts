import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { generateToken } from '../../../lib/auth-utils';


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
    
    // Aici ar trebui să trimiți email cu token
    console.log(`Token resetare parolă pentru ${email}: ${token}`);
    
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