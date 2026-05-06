import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  // TODO: SSO implementation — re-enable when production-ready
  return NextResponse.json({ ssoEnabled: false, ssoEnforced: false, orgId: null, orgSlug: null });
}
