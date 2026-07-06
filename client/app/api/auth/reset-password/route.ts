import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkResetRateLimit, rateLimitResponse } from '@/lib/rate-limit';


// Identical response for every outcome (account exists or not, email sent or
// not), so the endpoint can't be used to tell whether an email is registered.
const GENERIC_RESPONSE = {
  message: 'Dacă există un cont asociat acestui email, am trimis un cod de verificare.',
};

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Throttle by IP and by target account before any DB work, so this
    // endpoint can't be used to spam reset emails or open unlimited windows.
    const rateLimit = await checkResetRateLimit(request, email);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit, 'Prea multe cereri de resetare. Încearcă din nou mai târziu.') as NextResponse;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Unknown email: return the SAME generic response without creating a token
    // or sending mail. (Previously a 404 "Nu există cont" revealed non-members.)
    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Invalidate any previously issued reset tokens for this user, so only one
    // code is ever valid at a time (shrinks the brute-force target).
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Generează un token securizat de 8 cifre
    const token = generateToken(8);
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
    } catch (emailError) {
      // Log server-side, but still return the generic response - surfacing a
      // distinct error here would re-open the enumeration oracle (only real
      // accounts reach the email-sending step). Never log the token itself.
      console.error('Eroare la trimiterea email-ului de resetare:', emailError);
    }

    return NextResponse.json(GENERIC_RESPONSE);

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Eroare la trimiterea token-ului' },
      { status: 500 }
    );
  }
}