import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getAuditLogs } from '@/lib/db/audit-logs';
import { buildXlsx, xlsxResponse } from '@/lib/export/xlsx';
import { AUDIT_LOG_COLUMNS } from '@/lib/export/datasets';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    // "Export" passes the page filters (or, with no filters, the visible
    // page via page/pageSize); "Export All" passes none of these.
    const orgId = searchParams.get('orgId') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;
    const onlyPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const onlyPageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined;

    const rows: Record<string, unknown>[] = [];
    const pushLog = (l: Awaited<ReturnType<typeof getAuditLogs>>['logs'][number]) => {
      rows.push({
        timestamp: l.timestamp.toISOString(),
        organizationId: l.organizationId,
        userId: l.userId,
        role: l.role,
        action: l.action,
        module: l.module,
        recordId: l.recordId ?? '',
        oldValue: l.oldValue,
        newValue: l.newValue,
      });
    };

    if (onlyPage) {
      // Export exactly what's visible on screen (one page).
      const { logs } = await getAuditLogs({
        orgId, userId, action, dateFrom, dateTo, page: onlyPage, pageSize: onlyPageSize ?? 20,
      });
      logs.forEach(pushLog);
    } else {
      const HARD_CAP = 10000;
      const PAGE_SIZE = 500;
      let page = 1;
      while (rows.length < HARD_CAP) {
        const { logs, totalPages } = await getAuditLogs({
          orgId, userId, action, dateFrom, dateTo, page, pageSize: PAGE_SIZE,
        });
        for (const l of logs) {
          pushLog(l);
          if (rows.length >= HARD_CAP) break;
        }
        if (page >= totalPages || logs.length === 0) break;
        page += 1;
      }
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const buffer = await buildXlsx('Audit Logs', AUDIT_LOG_COLUMNS, rows);
    return xlsxResponse(buffer, `audit-logs-${stamp}.xlsx`);
  } catch (err) {
    console.error('[GET /api/audit-logs/export]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
