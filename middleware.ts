import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow API routes, static files, etc.
  if (pathname.startsWith('/api/') || pathname.startsWith('/invites/')) {
    return NextResponse.next();
  }

  const session = req.cookies.get('session')?.value;

  // Logged-in users hitting /login or / → send to dashboard
  // (the app layout will further redirect super_admin to /super-admin)
  if (session && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Unauthenticated users trying to reach any protected page → login
  if (!session && !pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
