import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['en', 'ar'] as const;
const DEFAULT_LOCALE = 'en';

const SKIP_PREFIXES = ['/api/', '/_next/'];

const PUBLIC_PATHS = new Set([
  '/', '/home', '/product', '/pricing', '/customers', '/security', '/about', '/contact', '/login', '/signup',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const hasLocale = LOCALES.some((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);

  if (!hasLocale) {
    const detectedLocale = DEFAULT_LOCALE;
    if (pathname === '/') {
      return NextResponse.redirect(new URL(`/${detectedLocale}`, req.url));
    }
    return NextResponse.redirect(new URL(`/${detectedLocale}${pathname}`, req.url));
  }

  const locale = LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) || DEFAULT_LOCALE;
  const pathnameWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';

  const session = req.cookies.get('session')?.value;

  // Let the login page handle its own redirect — middleware can't decode the
  // session to determine org slug, so we allow authenticated users to visit /login
  // and the page itself will redirect them to the correct org path.

  const isPublic = PUBLIC_PATHS.has(pathnameWithoutLocale);
  if (isPublic) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
