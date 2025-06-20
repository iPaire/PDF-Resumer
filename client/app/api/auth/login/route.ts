// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { compare } from 'bcryptjs'; // Use bcryptjs instead of bcrypt
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

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
      console.warn(`Login attempt for non-existent email: ${email}`);
      return NextResponse.json(
        { error: 'Date de autentificare invalide' },
        { status: 401 }
      );
    }

    // Use bcryptjs.compare instead of bcrypt.compare
    const passwordMatch = await compare(password, user.password);
    if (!passwordMatch) {
      console.warn(`Invalid password attempt for user: ${user.id}`);
      return NextResponse.json(
        { error: 'Date de autentificare invalide' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    const response = NextResponse.json({ 
      id: user.id,
      email: user.email,
      name: user.name,
      // Include other user fields except password
    });

    response.headers.set(
      'Set-Cookie',
      `auth-token=${token}; HttpOnly; Path=/; Max-Age=86400; ${
        process.env.NODE_ENV === 'production' ? 'Secure; SameSite=Strict' : ''
      }`
    );

    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Eroare internă a serverului' },
      { status: 500 }
    );
  }
}