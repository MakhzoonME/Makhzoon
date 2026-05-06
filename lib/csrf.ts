import { NextRequest, NextResponse } from 'next/server';

export function checkOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  if (!origin) return null; // non-browser clients allowed

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const allowed = [appUrl, 'https://makhzoon.me', 'https://www.makhzoon.me'];

  if (!allowed.some((o) => origin === o || origin.endsWith('.makhzoon.me'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
