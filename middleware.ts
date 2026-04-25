import { NextRequest, NextResponse } from 'next/server';

const SKIP_PREFIXES = ['/api/', '/invites/', '/_next/'];
const PUBLIC_PAGES = new Set(['/login', '/signup']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const session = req.cookies.get('session')?.value;

  // Authenticated users hitting public pages → root (page.tsx resolves the destination)
  if (session && PUBLIC_PAGES.has(pathname)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Unauthenticated users trying to access protected pages → login
  if (!session && !PUBLIC_PAGES.has(pathname) && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
