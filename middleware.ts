import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['en', 'ar'] as const;
const DEFAULT_LOCALE = 'en';

const SKIP_PREFIXES = ['/api/', '/_next/'];

const PUBLIC_PATHS = new Set([
  '/', '/home', '/product', '/pricing', '/customers', '/security', '/about', '/contact', '/login', '/signup',
]);

const MARKETING_HOSTS = new Set(['makhzoon.me', 'www.makhzoon.me']);
const APP_HOST = 'app.makhzoon.me';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host')?.split(':')[0] ?? '';

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const hasLocale = LOCALES.some((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);

  if (!hasLocale) {
    const destination = hostname === APP_HOST ? `/${DEFAULT_LOCALE}/login` : `/${DEFAULT_LOCALE}`;
    if (pathname === '/') {
      return NextResponse.redirect(new URL(destination, req.url));
    }
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}${pathname}`, req.url));
  }

  const locale = LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ?? DEFAULT_LOCALE;
  const pathnameWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';

  // makhzoon.me — only the coming soon root, redirect everything else
  if (MARKETING_HOSTS.has(hostname)) {
    if (pathnameWithoutLocale === '/') return NextResponse.next();
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  // app.makhzoon.me — redirect locale root to login
  if (hostname === APP_HOST && pathnameWithoutLocale === '/') {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  const session = req.cookies.get('session')?.value;

  const isPublic = PUBLIC_PATHS.has(pathnameWithoutLocale);
  if (isPublic) return NextResponse.next();

  if (!session) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
