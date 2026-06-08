import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getBackendLogs } from '@/lib/db/backend-logs';
import { hasSuperAdminPermission } from '@/lib/permissions/superadmin';
import type { LogLevel } from '@/lib/logging/backend-logger';

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasSuperAdminPermission(user, 'backendLogs', 'view'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const level = (searchParams.get('level') ?? 'all') as LogLevel | 'all';
    const orgId = searchParams.get('orgId') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined;

    const result = await getBackendLogs({ level, organizationId: orgId, userId, page, pageSize });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/superadmin/backend-logs]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
