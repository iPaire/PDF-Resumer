// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  
  // Aici verifici în baza de date
  // Exemplu simplist:
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || user.password !== hashPassword(password)) {
    return NextResponse.json(
      { error: 'Date de autentificare invalide' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
}