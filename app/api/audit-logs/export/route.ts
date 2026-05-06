import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAuditLogs } from '@/lib/db/audit-logs';

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

    const HARD_CAP = 5000;
    const PAGE_SIZE = 500;
    const rows: string[] = [];
    rows.push(['timestamp', 'organizationId', 'userId', 'role', 'action', 'module', 'recordId', 'oldValue', 'newValue'].join(','));

    let page = 1;
    let fetched = 0;

    while (fetched < HARD_CAP) {
      const { logs, totalPages } = await getAuditLogs({
        orgId, userId, action, dateFrom, dateTo, page, pageSize: PAGE_SIZE,
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
        fetched += 1;
        if (fetched >= HARD_CAP) break;
      }
      if (page >= totalPages || logs.length === 0) break;
      page += 1;
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
