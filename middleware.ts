import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MARKETING_HOSTS = new Set(['makhzoon.me', 'www.makhzoon.me']);
const DEFAULT_LOCALE = 'en';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] ?? '';

  if (MARKETING_HOSTS.has(host)) {
    const { pathname } = request.nextUrl;

    // Passthrough: static assets, API routes, Next.js internals
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/icon') ||
      pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    // Detect locale prefix (/en/... or /ar/...)
    const localeMatch = pathname.match(/^\/(en|ar)(\/.*)?$/);
    const locale = localeMatch ? localeMatch[1] : DEFAULT_LOCALE;
    const rest = localeMatch ? (localeMatch[2] ?? '') : pathname;

    // Allow the coming soon root page and login
    if (rest === '' || rest === '/' || rest === '/login') {
      return NextResponse.next();
    }

    // Everything else on the marketing domain → coming soon page
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
