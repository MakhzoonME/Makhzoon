import { supabaseAdmin } from '@/lib/supabase/admin';
import { BackendLogEntry, LogLevel } from '@/lib/logging/backend-logger';

export interface BackendLog extends BackendLogEntry {
  id: string;
}

type Row = Record<string, unknown>;

function toLog(r: Row): BackendLog {
  return {
    id: r.id as string,
    timestamp: r.timestamp ? new Date(r.timestamp as string) : new Date(),
    method: (r.method as string) ?? '',
    path: (r.path as string) ?? '',
    statusCode: (r.status_code as number) ?? 0,
    level: ((r.level as LogLevel) ?? 'info') as LogLevel,
    durationMs: (r.duration_ms as number) ?? 0,
    userId: r.user_id as string,
    userDisplayName: r.user_display_name as string,
    organizationId: r.organization_id as string,
    organizationName: r.organization_name as string,
    role: r.role as string,
    errorMessage: r.error_message as string,
    requestSummary: r.request_summary as string,
    responseSummary: r.response_summary as string,
  };
}

export interface GetBackendLogsOptions {
  limit?: number;
  level?: LogLevel | 'all';
  method?: string;
  path?: string;
  organizationId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}

export async function getBackendLogs(
  opts: GetBackendLogsOptions = {},
): Promise<{ items: BackendLog[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? (opts.limit ?? 200);

  const build = () => {
    let x = supabaseAdmin
      .from('backend_logs')
      .select('*', { count: 'exact' });
    if (opts.level && opts.level !== 'all') x = x.eq('level', opts.level);
    if (opts.organizationId) x = x.eq('organization_id', opts.organizationId);
    if (opts.userId) x = x.eq('user_id', opts.userId);
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
    items: (data ?? []).map(toLog),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
