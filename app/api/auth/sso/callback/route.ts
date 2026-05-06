import { NextRequest, NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(_req: NextRequest) {
  // TODO: SSO implementation — re-enable when production-ready
  return NextResponse.redirect(new URL('/login?sso_error=not_available', APP_URL));
}
