import { NextRequest, NextResponse } from 'next/server';

const SKIP_PREFIXES = ['/api/', '/invites/', '/_next/'];

// Marketing pages and auth pages are public — no session required
const PUBLIC_PATHS = new Set([
  '/', '/home', '/product', '/pricing', '/customers', '/security', '/about', '/contact', '/login',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const session = req.cookies.get('session')?.value;

  // Marketing and auth pages are always accessible — let the login page
  // itself route already-signed-in users based on their role.
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Everything else (/superadmin/*, /[orgSlug]/*, /signup) requires a session
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
