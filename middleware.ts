import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'ar'];
const DEFAULT_LOCALE = 'en';
const SKIP_PREFIXES = ['/api/', '/invites/', '/_next/'];

// Paths that don't require a session (without locale prefix)
const PUBLIC_PATHS = new Set([
  '/', '/home', '/product', '/pricing', '/customers', '/security', '/about', '/contact', '/login', '/signup',
]);

function stripLocale(pathname: string): { locale: string | null; rest: string } {
  const parts = pathname.split('/');
  if (parts.length > 1 && SUPPORTED_LOCALES.includes(parts[1])) {
    return { locale: parts[1], rest: '/' + parts.slice(2).join('/') || '/' };
  }
  return { locale: null, rest: pathname };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const { locale, rest } = stripLocale(pathname);

  // If no locale prefix, redirect to add the default locale
  if (!locale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  const session = req.cookies.get('session')?.value;

  // Marketing and auth pages are always accessible
  if (PUBLIC_PATHS.has(rest) || rest === '/') {
    return NextResponse.next();
  }

  // Everything else requires a session
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
