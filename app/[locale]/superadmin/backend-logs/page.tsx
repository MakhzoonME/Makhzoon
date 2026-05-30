'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useT } from '@/hooks/ui';

interface BackendLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  level: 'success' | 'warning' | 'error' | 'info';
  durationMs: number;
  userId?: string;
  userDisplayName?: string;
  organizationId?: string;
  organizationName?: string;
  role?: string;
  errorMessage?: string;
  requestSummary?: string;
  responseSummary?: string;
}

const LEVEL_STYLES: Record<string, string> = {
  success: 'bg-[var(--green-100)] text-[var(--green-700)] border border-[var(--green-100)]',
  warning: 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border border-[var(--yellow-100)]',
  error:   'bg-[var(--red-100)] text-[var(--red-700)] border border-[var(--red-100)]',
  info:    'bg-[var(--primary-100)] text-[var(--primary-700)] border border-[var(--primary-100)]',
};

const METHOD_STYLES: Record<string, string> = {
  GET:    'text-blue-700',
  POST:   'text-green-700',
  PATCH:  'text-yellow-700',
  PUT:    'text-orange-700',
  DELETE: 'text-red-700',
};

function statusColor(code: number) {
  if (code >= 500) return 'text-red-600 font-semibold';
  if (code >= 400) return 'text-yellow-600 font-semibold';
  if (code >= 200) return 'text-green-600';
  return 'text-gray-500';
}

function fmt(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

export default function BackendLogsPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const level = searchParams.get('level') ?? 'all';
  const orgId = searchParams.get('orgId') ?? '';
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 50;
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const autoRefresh = searchParams.get('autoRefresh') === 'true';
  const userSearch = searchParams.get('userSearch') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  const [logs, setLogs] = useState<BackendLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ level, page: String(page), pageSize: String(pageSize) });
      if (orgId.trim()) params.set('orgId', orgId.trim());
      const res = await fetch(`/api/superadmin/backend-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [level, orgId, page, pageSize]);

  // TODO: migrate fetchLogs to useQuery so loading/logs/total/totalPages
  // become derived rather than kept in local state. Until then this effect
  // legitimately needs to setState on filter change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(fetchLogs, 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  function syncAllToUrl(next: Partial<Record<'level' | 'orgId' | 'pageSize' | 'page' | 'autoRefresh' | 'userSearch' | 'dateFrom' | 'dateTo', string>>) {
    updateUrl({
      level: next.level ?? level,
      orgId: next.orgId ?? orgId,
      pageSize: next.pageSize ?? String(pageSize),
      page: next.page ?? String(page),
      autoRefresh: next.autoRefresh ?? String(autoRefresh),
      userSearch: next.userSearch ?? userSearch,
      dateFrom: next.dateFrom ?? dateFrom,
      dateTo: next.dateTo ?? dateTo,
    });
  }

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.userDisplayName?.toLowerCase().includes(q) ||
          l.userId?.toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((l) => new Date(l.timestamp).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      result = result.filter((l) => new Date(l.timestamp).getTime() <= to);
    }
    return result;
  }, [logs, userSearch, dateFrom, dateTo]);

  const levels = ['all', 'success', 'warning', 'error', 'info'];

  function clearFilters() {
    syncAllToUrl({ userSearch: '', dateFrom: '', dateTo: '', orgId: '', level: 'all', page: '1' });
  }

  const hasActiveFilters = userSearch || dateFrom || dateTo || orgId || level !== 'all';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('backendLogs.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('backendLogs.description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => syncAllToUrl({ autoRefresh: String(e.target.checked) })}
              className="rounded border-border"
            />
            {t('backendLogs.autoRefresh')}
          </label>
          <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 me-1.5', loading && 'animate-spin')} />
            {t('backendLogs.refresh')}
          </Button>
        </div>
      </div>

      <div className="bg-surface-card rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="text-xs text-gray-500 shrink-0">{t('backendLogs.level')}</Label>
          <div className="flex gap-1 flex-wrap">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => syncAllToUrl({ level: l })}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium capitalize transition-colors',
                  level === l
                    ? l === 'all' ? 'bg-gray-700 text-white' : cn(LEVEL_STYLES[l], 'ring-1 ring-current')
                    : 'bg-surface-page text-gray-600 hover:bg-gray-200/60'
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t('backendLogs.userName')}</Label>
            <div className="relative">
              <Input
                value={userSearch}
                onChange={(e) => syncAllToUrl({ userSearch: e.target.value })}
                placeholder={t('backendLogs.searchUser')}
                className="h-8 text-xs pe-7"
              />
              {userSearch && (
                <button onClick={() => syncAllToUrl({ userSearch: '' })} className="absolute end-2 top-1/2 -translate-y-1/2">
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t('backendLogs.orgId')}</Label>
            <div className="relative">
              <Input
                value={orgId}
                onChange={(e) => syncAllToUrl({ orgId: e.target.value })}
                placeholder={t('backendLogs.filterOrg')}
                className="h-8 text-xs pe-7"
              />
              {orgId && (
                <button onClick={() => syncAllToUrl({ orgId: '' })} className="absolute end-2 top-1/2 -translate-y-1/2">
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t('backendLogs.dateFrom')}</Label>
            <Input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => syncAllToUrl({ dateFrom: e.target.value })}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t('backendLogs.dateTo')}</Label>
            <Input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => syncAllToUrl({ dateTo: e.target.value })}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t('backendLogs.limit')}</Label>
            <Select value={String(pageSize)} onValueChange={(v) => syncAllToUrl({ pageSize: v, page: '1' })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['20', '50', '100', '200'].map((n) => (
                  <SelectItem key={n} value={n}>{n} per page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs text-gray-400">
            {total} total records{total > 0 && `, page ${page} of ${totalPages}`}
          </span>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} className="h-7 text-xs text-gray-500">
              <X className="h-3 w-3 me-1" />
              {t('backendLogs.clearFilters')}
            </Button>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="bg-surface-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 text-xs border border-border rounded-md hover:bg-surface-page disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => syncAllToUrl({ page: '1' })}
            >
              First
            </button>
            <button
              className="px-2 py-1 text-xs border border-border rounded-md hover:bg-surface-page disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => syncAllToUrl({ page: String(page - 1) })}
            >
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button
                  key={pageNum}
                  className={`px-2 py-1 text-xs border rounded transition-colors ${page === pageNum ? 'bg-primary-600 text-white border-primary-600' : 'border-border hover:bg-surface-page'}`}
                  onClick={() => syncAllToUrl({ page: String(pageNum) })}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="px-2 py-1 text-xs border border-border rounded-md hover:bg-surface-page disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => syncAllToUrl({ page: String(page + 1) })}
            >
              Next
            </button>
            <button
              className="px-2 py-1 text-xs border border-border rounded-md hover:bg-surface-page disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => syncAllToUrl({ page: String(totalPages) })}
            >
              Last
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-page border-b border-border text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.time')}</th>
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.method')}</th>
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.path')}</th>
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.status')}</th>
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.level')}</th>
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.duration')}</th>
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.user')}</th>
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.organization')}</th>
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.role')}</th>
                <th className="px-3 py-2.5 text-start font-medium">{t('backendLogs.error')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    {loading ? t('common.loading') : t('backendLogs.noLogs')}
                  </td>
                </tr>
              )}
              {filteredLogs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className={cn(
                      'cursor-pointer hover:bg-surface-page transition-colors',
                      log.level === 'error' && 'bg-[var(--red-50)]',
                      expanded === log.id && 'bg-[var(--primary-50)]'
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">{fmt(log.timestamp)}</td>
                    <td className={cn('px-3 py-2 font-mono font-semibold', METHOD_STYLES[log.method] ?? 'text-gray-600')}>{log.method}</td>
                    <td className="px-3 py-2 font-mono text-gray-700 max-w-[220px] truncate" title={log.path}>{log.path}</td>
                    <td className={cn('px-3 py-2 font-mono', statusColor(log.statusCode))}>{log.statusCode}</td>
                    <td className="px-3 py-2">
                      <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium capitalize', LEVEL_STYLES[log.level] ?? 'bg-surface-page text-gray-600')}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{log.durationMs}ms</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[150px] truncate" title={log.userDisplayName ?? log.userId}>
                      {log.userDisplayName ?? (log.userId ? <span className="font-mono text-gray-400 text-[10px]">{log.userId.slice(0, 10)}…</span> : <span className="text-gray-300">—</span>)}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate" title={log.organizationName ?? log.organizationId}>
                      {log.organizationName ?? (log.organizationId ? <span className="font-mono text-gray-400 text-[10px]">{log.organizationId.slice(0, 8)}…</span> : <span className="text-gray-300">—</span>)}
                    </td>
                    <td className="px-3 py-2 text-gray-500 capitalize whitespace-nowrap">{log.role?.replace(/_/g, ' ') ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-red-600 max-w-[180px] truncate" title={log.errorMessage}>{log.errorMessage ?? ''}</td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-[var(--primary-50)]">
                      <td colSpan={10} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold text-gray-600 mb-2 text-xs uppercase tracking-wide">{t('backendLogs.details')}</p>
                            <dl className="space-y-1 text-xs">
                              <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">{t('backendLogs.logId')}</dt><dd className="font-mono text-gray-600 break-all">{log.id}</dd></div>
                              <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">{t('backendLogs.user')}</dt><dd className="text-gray-600">{log.userDisplayName ?? log.userId ?? '—'}</dd></div>
                              {log.userDisplayName && log.userId && (
                                <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">{t('backendLogs.userId')}</dt><dd className="font-mono text-gray-400 text-[11px] break-all">{log.userId}</dd></div>
                              )}
                              <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">{t('backendLogs.orgIdDetail')}</dt><dd className="font-mono text-gray-600 break-all">{log.organizationId ?? '—'}</dd></div>
                              <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">{t('backendLogs.duration')}</dt><dd className="text-gray-600">{log.durationMs}ms</dd></div>
                              {log.errorMessage && <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">{t('backendLogs.error')}</dt><dd className="text-red-600">{log.errorMessage}</dd></div>}
                            </dl>
                          </div>
                          <div className="space-y-2">
                            {log.requestSummary && (
                              <div>
                                <p className="font-semibold text-gray-600 mb-1 text-xs uppercase tracking-wide">{t('backendLogs.request')}</p>
                                <pre className="bg-surface-card border border-border rounded p-2 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">{log.requestSummary}</pre>
                              </div>
                            )}
                            {log.responseSummary && (
                              <div>
                                <p className="font-semibold text-gray-600 mb-1 text-xs uppercase tracking-wide">{t('backendLogs.response')}</p>
                                <pre className="bg-surface-card border border-border rounded p-2 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">{log.responseSummary}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
