import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAuditLogs } from '@/lib/firestore/audit-logs';

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const orgId =
      user.role === 'admin'
        ? (user.organizationId ?? undefined)
        : (searchParams.get('orgId') ?? undefined);
    const userId = searchParams.get('userId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;
    const cursor = searchParams.get('cursor') ?? undefined;

    const result = await getAuditLogs({ orgId, userId, action, dateFrom, dateTo, cursor });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/audit-logs]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
