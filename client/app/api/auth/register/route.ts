import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      if (existingUser.password) {
        return NextResponse.json(
          { error: 'Email deja înregistrat' },
          { status: 400 }
        );
      } else {
        const hashedPassword = await hashPassword(password);
        const updatedUser = await prisma.user.update({
          where: { email },
          data: {
            name,
            password: hashedPassword,
            emailVerified: new Date(),
          }
        });

        return NextResponse.json({
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email
        });
      }
    }
    
    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'personal',
        emailVerified: new Date(),
        subscription: 'free',
        trialOffered: false // Marcam că nu am oferit încă trial
      }
    });
    
    return NextResponse.json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Eroare la înregistrare' },
      { status: 500 }
    );
  }
}