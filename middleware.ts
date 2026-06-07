import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'ar'];
const DEFAULT_LOCALE = 'en';
const LOCALE_COOKIE = 'makhzoon-locale';
const SKIP_PREFIXES = ['/api/', '/_next/'];

const MARKETING_HOSTS = new Set(['makhzoon.me', 'www.makhzoon.me']);
const APP_HOSTS = new Set(['app.makhzoon.me', 'dev.makhzoon.me', 'stg.makhzoon.me']);

// Paths that belong only to the marketing site — block on app hosts
const MARKETING_ONLY_PATHS = new Set([
  '/home', '/product', '/pricing', '/customers', '/security', '/about', '/contact',
]);

const AUTH_PATHS = new Set(['/login', '/signup', '/reset-password']);

function detectLocale(req: NextRequest): string {
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale;

  const acceptLang = req.headers.get('accept-language') ?? '';
  const primary = acceptLang.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (primary.startsWith('ar')) return 'ar';

  return DEFAULT_LOCALE;
}

function stripLocale(pathname: string): { locale: string | null; rest: string } {
  const parts = pathname.split('/');
  if (parts.length > 1 && SUPPORTED_LOCALES.includes(parts[1])) {
    return { locale: parts[1], rest: '/' + parts.slice(2).join('/') || '/' };
  }
  return { locale: null, rest: pathname };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host')?.split(':')[0] ?? '';

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Public shareable pages — no locale prefix, no session required
  if (pathname.startsWith('/r/') || pathname.startsWith('/inv/') || pathname.startsWith('/delivery/') || pathname.startsWith('/w/')) {
    return NextResponse.next();
  }

  const { locale, rest } = stripLocale(pathname);

  const isAppHost = APP_HOSTS.has(hostname);

  // If no locale prefix, redirect with detected locale
  if (!locale) {
    const detected = detectLocale(req);
    const url = req.nextUrl.clone();
    if (isAppHost && pathname !== '/') {
      url.pathname = `/${detected}${pathname}`;
    } else {
      url.pathname = `/${detected}${pathname === '/' ? '' : pathname}`;
    }
    return NextResponse.redirect(url);
  }

  // makhzoon.me / www.makhzoon.me — serve marketing pages only; block everything else
  if (MARKETING_HOSTS.has(hostname)) {
    if (rest === '/' || MARKETING_ONLY_PATHS.has(rest)) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  // App hosts — allow root and marketing pages (consistent across all branches)
  if (isAppHost) {
    if (rest === '/' || MARKETING_ONLY_PATHS.has(rest)) {
      return NextResponse.next();
    }
  }

  const session = req.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token') && c.value
  );

  // Auth pages are always accessible
  if (AUTH_PATHS.has(rest)) {
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
