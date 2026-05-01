import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getBackendLogs } from '@/lib/db/backend-logs';
import type { LogLevel } from '@/lib/logging/backend-logger';

const ALLOWED_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.has(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const level = (searchParams.get('level') ?? 'all') as LogLevel | 'all';
    const orgId = searchParams.get('orgId') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 500);

    const logs = await getBackendLogs({ level, organizationId: orgId, userId, limit });

    return NextResponse.json(logs, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/superadmin/backend-logs]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
