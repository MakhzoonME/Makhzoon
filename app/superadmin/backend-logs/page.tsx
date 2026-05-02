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
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error:   'bg-red-100 text-red-800',
  info:    'bg-blue-100 text-blue-800',
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

  const [logs, setLogs] = useState<BackendLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState(searchParams.get('level') ?? 'all');
  const [orgId, setOrgId] = useState(searchParams.get('orgId') ?? '');
  const [limit, setLimit] = useState(searchParams.get('limit') ?? '200');
  const [autoRefresh, setAutoRefresh] = useState(searchParams.get('autoRefresh') === 'true');
  const [expanded, setExpanded] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [userSearch, setUserSearch] = useState(searchParams.get('userSearch') ?? '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, level });
      if (orgId.trim()) params.set('orgId', orgId.trim());
      const res = await fetch(`/api/superadmin/backend-logs?${params}`);
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
    }
  }, [level, orgId, limit]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(fetchLogs, 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  useEffect(() => {
    const urlLevel = searchParams.get('level') ?? 'all';
    const urlOrgId = searchParams.get('orgId') ?? '';
    const urlLimit = searchParams.get('limit') ?? '200';
    const urlAutoRefresh = searchParams.get('autoRefresh') === 'true';
    const urlUserSearch = searchParams.get('userSearch') ?? '';
    const urlDateFrom = searchParams.get('dateFrom') ?? '';
    const urlDateTo = searchParams.get('dateTo') ?? '';

    if (urlLevel !== level) setLevel(urlLevel);
    if (urlOrgId !== orgId) setOrgId(urlOrgId);
    if (urlLimit !== limit) setLimit(urlLimit);
    if (urlAutoRefresh !== autoRefresh) setAutoRefresh(urlAutoRefresh);
    if (urlUserSearch !== userSearch) setUserSearch(urlUserSearch);
    if (urlDateFrom !== dateFrom) setDateFrom(urlDateFrom);
    if (urlDateTo !== dateTo) setDateTo(urlDateTo);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  function syncAllToUrl(next: Partial<Record<'level' | 'orgId' | 'limit' | 'autoRefresh' | 'userSearch' | 'dateFrom' | 'dateTo', string>>) {
    updateUrl({
      level: next.level ?? level,
      orgId: next.orgId ?? orgId,
      limit: next.limit ?? limit,
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
    setUserSearch('');
    setDateFrom('');
    setDateTo('');
    setOrgId('');
    setLevel('all');
    syncAllToUrl({ userSearch: '', dateFrom: '', dateTo: '', orgId: '', level: 'all' });
  }

  const hasActiveFilters = userSearch || dateFrom || dateTo || orgId || level !== 'all';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('backendLogs.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-0.5">{t('backendLogs.description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => { setAutoRefresh(e.target.checked); syncAllToUrl({ autoRefresh: String(e.target.checked) }); }}
              className="rounded border-gray-300"
            />
            {t('backendLogs.autoRefresh')}
          </label>
          <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} />
            {t('backendLogs.refresh')}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="text-xs text-gray-500 shrink-0">{t('backendLogs.level')}</Label>
          <div className="flex gap-1 flex-wrap">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => { setLevel(l); syncAllToUrl({ level: l }); }}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium capitalize transition-colors',
                  level === l
                    ? l === 'all' ? 'bg-gray-800 text-white' : cn(LEVEL_STYLES[l], 'ring-1 ring-current')
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                onChange={(e) => { setUserSearch(e.target.value); syncAllToUrl({ userSearch: e.target.value }); }}
                placeholder={t('backendLogs.searchUser')}
                className="h-8 text-xs pr-7"
              />
              {userSearch && (
                <button onClick={() => { setUserSearch(''); syncAllToUrl({ userSearch: '' }); }} className="absolute right-2 top-1/2 -translate-y-1/2">
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
                onChange={(e) => { setOrgId(e.target.value); syncAllToUrl({ orgId: e.target.value }); }}
                placeholder={t('backendLogs.filterOrg')}
                className="h-8 text-xs pr-7"
              />
              {orgId && (
                <button onClick={() => { setOrgId(''); syncAllToUrl({ orgId: '' }); }} className="absolute right-2 top-1/2 -translate-y-1/2">
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
              onChange={(e) => { setDateFrom(e.target.value); syncAllToUrl({ dateFrom: e.target.value }); }}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t('backendLogs.dateTo')}</Label>
            <Input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); syncAllToUrl({ dateTo: e.target.value }); }}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t('backendLogs.limit')}</Label>
            <Select value={limit} onValueChange={(v) => { setLimit(v); syncAllToUrl({ limit: v }); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['50', '100', '200', '500'].map((n) => (
                  <SelectItem key={n} value={n}>{n} records</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs text-gray-400">
            {filteredLogs.length} of {logs.length} records
          </span>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} className="h-7 text-xs text-gray-500">
              <X className="h-3 w-3 mr-1" />
              {t('backendLogs.clearFilters')}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.time')}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.method')}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.path')}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.status')}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.level')}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.duration')}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.user')}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.organization')}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.role')}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t('backendLogs.error')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
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
                      'cursor-pointer hover:bg-gray-50 transition-colors',
                      log.level === 'error' && 'bg-red-50 hover:bg-red-100',
                      expanded === log.id && 'bg-blue-50'
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">{fmt(log.timestamp)}</td>
                    <td className={cn('px-3 py-2 font-mono font-semibold', METHOD_STYLES[log.method] ?? 'text-gray-600')}>{log.method}</td>
                    <td className="px-3 py-2 font-mono text-gray-700 max-w-[220px] truncate" title={log.path}>{log.path}</td>
                    <td className={cn('px-3 py-2 font-mono', statusColor(log.statusCode))}>{log.statusCode}</td>
                    <td className="px-3 py-2">
                      <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium capitalize', LEVEL_STYLES[log.level] ?? 'bg-gray-100 text-gray-600')}>
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
                    <tr key={`${log.id}-detail`} className="bg-blue-50">
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
                                <pre className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">{log.requestSummary}</pre>
                              </div>
                            )}
                            {log.responseSummary && (
                              <div>
                                <p className="font-semibold text-gray-600 mb-1 text-xs uppercase tracking-wide">{t('backendLogs.response')}</p>
                                <pre className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">{log.responseSummary}</pre>
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
