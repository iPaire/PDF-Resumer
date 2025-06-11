// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email și parolă sunt obligatorii' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Log failed attempts (security measure)
      console.warn(`Login attempt for non-existent email: ${email}`);
      return NextResponse.json(
        { error: 'Date de autentificare invalide' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.warn(`Invalid password attempt for user: ${user.id}`);
      return NextResponse.json(
        { error: 'Date de autentificare invalide' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    // Set HTTP-only cookie
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400, // 1 day
      path: '/',
    });

    const { password: _unused, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Eroare internă a serverului' },
      { status: 500 }
    );
  }
}