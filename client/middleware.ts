import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from './app/lib/prisma';

export async function middleware(req: NextRequest) {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
  });
  const { pathname } = req.nextUrl;
  
  console.log('Middleware - pathname:', pathname, 'token exists:', !!token, 'token subscription:', token?.subscription, 'token id:', token?.id, 'trial expires:', token?.trialExpires);
  
  if (!token) {
    console.log('No token found, checking cookies:', req.cookies.getAll().map(c => c.name));
  }
  
  // Check if trial has expired (for both 'trial' and 'premium' subscriptions with trial period)
  if (token && (token.subscription === 'trial' || token.subscription === 'premium') && token.trialExpires) {
    const now = new Date();
    const trialExpires = new Date(token.trialExpires);
    
    if (now > trialExpires) {
      try {
        // Update user to free subscription if trial subscription, keep premium if premium subscription
        const newSubscription = token.subscription === 'premium' ? 'premium' : 'free';
        await prisma.user.update({
          where: { id: token.id as string },
          data: { 
            subscription: newSubscription,
            trialExpires: null
          }
        });
        
        // Only redirect to trial expired page if this was a trial subscription
        if (token.subscription === 'trial' && !pathname.startsWith('/trial-expired')) {
          return NextResponse.redirect(new URL('/trial-expired', req.url));
        }
      } catch (error) {
        console.error('Error updating trial status:', error);
      }
    }
  }

  // Handle dashboard access
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      console.log('Redirecting to login because no token for dashboard access');
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // Redirect only free users to summaries page (trial, premium, and standard users can access dashboard)
    if (token.subscription === 'free') {
      console.log('Redirecting free user from dashboard to summaries');
      return NextResponse.redirect(new URL('/summaries', req.url));
    }
    
    console.log('Allowing access to dashboard for user with subscription:', token.subscription);
  }

  // Redirect based on subscription when accessing login while logged in
  if (token && pathname.startsWith('/login')) {
    console.log('User is logged in, redirecting based on subscription:', token.subscription);
    
    // Redirect free users to summaries instead of dashboard
    if (token.subscription === 'free') {
      return NextResponse.redirect(new URL('/summaries', req.url));
    }
    
    // Redirect premium, trial, and standard users to dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|api|_next/static|_next/image|favicon.ico).*)',
  ]
};