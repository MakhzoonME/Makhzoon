import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAuditLogs } from '@/lib/firestore/audit-logs';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;

    // Page through to collect all matching rows. Cap to avoid runaway exports.
    const HARD_CAP = 5000;
    const PAGE = 500;
    const rows: string[] = [];
    rows.push(['timestamp', 'organizationId', 'userId', 'role', 'action', 'module', 'recordId', 'oldValue', 'newValue']
      .join(','));

    let cursor: string | undefined;
    let total = 0;
    while (total < HARD_CAP) {
      const { logs, nextCursor } = await getAuditLogs({
        orgId, userId, action, dateFrom, dateTo, limit: PAGE, cursor,
      });
      for (const l of logs) {
        rows.push([
          l.timestamp.toISOString(),
          l.organizationId,
          l.userId,
          l.role,
          l.action,
          l.module,
          l.recordId ?? '',
          l.oldValue,
          l.newValue,
        ].map(csvEscape).join(','));
        total += 1;
        if (total >= HARD_CAP) break;
      }
      if (!nextCursor) break;
      cursor = nextCursor;
    }

    return new NextResponse(rows.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/audit-logs/export]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
