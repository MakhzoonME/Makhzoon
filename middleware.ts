import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'ar'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: SupportedLocale = 'en';
const LOCALE_COOKIE = 'makhzoon-locale';

function detectLocale(request: NextRequest): SupportedLocale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as SupportedLocale)) {
    return cookieLocale as SupportedLocale;
  }

  const acceptLang = request.headers.get('accept-language') ?? '';
  const primaryLang = acceptLang.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (primaryLang.startsWith('ar')) {
    return 'ar';
  }

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    const locale = detectLocale(request);
    return NextResponse.redirect(new URL(`/${locale}/`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg).*)'],
};
