import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from './app/lib/prisma';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;
  
  // Check if trial has expired
  if (token && token.subscription === 'trial' && token.trialExpires) {
    const now = new Date();
    const trialExpires = new Date(token.trialExpires);
    
    if (now > trialExpires) {
      try {
        // Update user to free subscription
        await prisma.user.update({
          where: { id: token.id as string },
          data: { 
            subscription: 'free',
            trialExpires: null
          }
        });
        
        // Redirect to trial expired page if not already there
        if (!pathname.startsWith('/trial-expired')) {
          return NextResponse.redirect(new URL('/trial-expired', req.url));
        }
      } catch (error) {
        console.error('Error updating trial status:', error);
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

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};