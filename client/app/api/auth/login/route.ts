// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Presupunând că ai un fișier de configurare Prisma
import bcrypt from 'bcrypt'; // Sau altă librărie pentru hashing

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Verifică dacă există utilizatorul cu acest email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Dacă nu există utilizator sau parola nu se potrivește
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { error: 'Date de autentificare invalide' },
        { status: 401 }
      );
    }

    // Returnează datele utilizatorului (fără parolă)
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Eroare internă a serverului' },
      { status: 500 }
    );
  }
}