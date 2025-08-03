import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Verificăm dacă trial-ul a expirat
  if (token && token.subscription === 'trial' && token.trialExpires) {
    const now = new Date();
    const trialExpires = new Date(token.trialExpires);
    
    if (now > trialExpires) {
      // Actualizăm utilizatorul la abonament free
      await prisma.user.update({
        where: { id: token.id as string },
        data: { 
          subscription: 'free',
          trialExpires: null
        }
      });
      
      // Redirecționăm către o pagină de notificare
      if (pathname !== '/trial-expired') {
        return NextResponse.redirect(new URL('/trial-expired', req.url));
      }
    }
  }

  // Redirect to login if accessing protected routes without session
  if (!token && pathname.startsWith('/dashboard')) {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if logged in and accessing login
  if (token && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

// Specify the paths the middleware should run on
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};