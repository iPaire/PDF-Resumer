import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { validateRegister } from '@/lib/validation';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Per-IP throttle: limits account-creation spam and mass email enumeration
    // via the "email already registered" response below.
    const rateLimit = await checkRateLimit('auth', getClientIp(request));
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit, 'Prea multe încercări. Încearcă din nou mai târziu.') as NextResponse;
    }

    const body = await request.json().catch(() => null);

    // Validate & normalize before doing any DB work or hashing.
    // Previously the route accepted any payload - a 1-char password was hashed
    // and stored, and a malformed email created an unusable account.
    const validation = validateRegister(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.errors[0].message, errors: validation.errors },
        { status: 400 }
      );
    }
    const { name, email, password } = validation.value;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      // SECURITY: never set a password on an existing account from this
      // unauthenticated endpoint. Previously, an account that existed WITHOUT a
      // password (OAuth-only signup) had an attacker-supplied password written
      // to it here with no proof of ownership - a full account-takeover vector.
      // Every existing email now gets the same generic response. An OAuth user
      // who wants password login must set it from an authenticated flow, which
      // this route is not.
      return NextResponse.json(
        { error: 'Email deja înregistrat' },
        { status: 400 }
      );
    }
    
    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'personal',
        // KNOWN LIMITATION: email ownership is not actually verified - the
        // account is marked verified at creation. A real flow would leave this
        // null and confirm via the existing VerificationToken + Resend email
        // path before granting access. Left as-is to keep the demo usable.
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