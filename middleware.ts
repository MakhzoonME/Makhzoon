import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/invites/') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get('session')?.value;

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Role-based redirect is handled client-side after session verification
  // Server-side deep validation happens in API routes via withAuth/withRole
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
