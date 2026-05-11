import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'ar'];
const DEFAULT_LOCALE = 'en';
const SKIP_PREFIXES = ['/api/', '/_next/'];

const PUBLIC_PATHS = new Set([
  '/', '/home', '/product', '/pricing', '/customers', '/security', '/about', '/contact', '/login', '/signup',
]);

const MARKETING_HOSTS = new Set(['makhzoon.me', 'www.makhzoon.me']);
const APP_HOST = 'app.makhzoon.me';

function stripLocale(pathname: string): { locale: string | null; rest: string } {
  const parts = pathname.split('/');
  if (parts.length > 1 && SUPPORTED_LOCALES.includes(parts[1])) {
    return { locale: parts[1], rest: '/' + parts.slice(2).join('/') || '/' };
  }
  return { locale: null, rest: pathname };
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host')?.split(':')[0] ?? '';

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const { locale, rest } = stripLocale(pathname);

  // If no locale prefix, redirect to add the default locale
  if (!locale) {
    const url = req.nextUrl.clone();
    const destination = hostname === APP_HOST ? `/${DEFAULT_LOCALE}/login` : `/${DEFAULT_LOCALE}`;
    url.pathname = `${destination}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  // makhzoon.me — only serve the coming soon root; redirect everything else
  if (MARKETING_HOSTS.has(hostname)) {
    if (rest === '/') return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  // app.makhzoon.me — redirect locale root to login
  if (hostname === APP_HOST && rest === '/') {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  const session = req.cookies.get('session')?.value;

  // Marketing and auth pages are always accessible
  if (PUBLIC_PATHS.has(rest) || rest === '/') {
    return NextResponse.next();
  }

  // Invite acceptance pages are public — invitee has no session yet
  if (rest.startsWith('/invites/')) {
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
