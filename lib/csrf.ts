import { NextRequest, NextResponse } from 'next/server';

/**
 * Explicit first-party origin allowlist. The previous check accepted ANY
 * `*.makhzoon.me` origin, which would trust a future untrusted subdomain
 * (e.g. a customer-controlled receipt host). We enumerate the exact hosts
 * instead (audit finding S6).
 */
const ALLOWED_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://makhzoon.me',
    'https://www.makhzoon.me',
    'https://app.makhzoon.me',
    'https://dev.makhzoon.me',
    'https://stg.makhzoon.me',
    'https://rcpt-app.makhzoon.me',
    'https://rcpt-dev.makhzoon.me',
    'https://rcpt-stg.makhzoon.me',
  ].filter((o): o is string => !!o),
);

export function checkOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  if (!origin) return null; // non-browser clients (no Origin header) allowed

  // localhost during development
  if (process.env.NODE_ENV === 'development' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return null;
  }

  if (!ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
