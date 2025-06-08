// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    
    // Verifică dacă email-ul există deja
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email deja înregistrat' },
        { status: 400 }
      );
    }
    
    // Creează noul utilizator cu parola hash-uită
    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'personal' // Rol implicit
      }
    });
    
    // Returnează răspuns fără parolă
    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword);
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Eroare la înregistrare' },
      { status: 500 }
    );
  }
}