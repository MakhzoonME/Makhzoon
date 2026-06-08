import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AuditLog } from '@/types';

type Row = Record<string, unknown>;

function toLog(r: Row): AuditLog {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    userId: r.user_id as string,
    role: r.role as AuditLog['role'],
    action: r.action as string,
    module: r.module as string,
    recordId: r.record_id as string,
    oldValue: r.old_value as AuditLog['oldValue'],
    newValue: r.new_value as AuditLog['newValue'],
    timestamp: r.timestamp ? new Date(r.timestamp as string) : new Date(),
    transferMode: r.transfer_mode as boolean,
    spaceId: (r.space_id as string) ?? undefined,
  };
}

const SUPERADMIN_ROLES = ['super_admin', 'makhzoon_admin', 'makhzoon_support'];

export async function getAuditLogs(opts?: {
  orgId?: string;
  spaceId?: string;
  userId?: string;
  recordId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  excludeSuperadminActions?: boolean;
}): Promise<{ logs: AuditLog[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;

  // Shared filter applied to both the count and the page query (a builder
  // can't be reused once awaited).
  const build = () => {
    let x = supabaseAdmin.from('audit_logs').select('*', { count: 'exact' });
    if (opts?.orgId) x = x.eq('organization_id', opts.orgId);
    if (opts?.spaceId) x = x.eq('space_id', opts.spaceId);
    if (opts?.userId) x = x.eq('user_id', opts.userId);
    if (opts?.recordId) x = x.eq('record_id', opts.recordId);
    if (opts?.action) x = x.eq('action', opts.action);
    if (opts?.dateFrom)
      x = x.gte('timestamp', new Date(opts.dateFrom).toISOString());
    if (opts?.dateTo)
      x = x.lte('timestamp', new Date(opts.dateTo).toISOString());
    if (opts?.excludeSuperadminActions) {
      // Org users must not see superadmin or transfer-mode actions.
      x = x
        .not('role', 'in', `(${SUPERADMIN_ROLES.join(',')})`)
        .or('transfer_mode.is.null,transfer_mode.eq.false');
    }
    return x;
  };

  const { count } = await build()
    .order('timestamp', { ascending: false })
    .range(0, 0);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize;

  const { data, error } = await build()
    .order('timestamp', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;

  return {
    logs: (data ?? []).map(toLog),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
