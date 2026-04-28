'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

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
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function BackendLogsPage() {
  const [logs, setLogs] = useState<BackendLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<string>('all');
  const [orgId, setOrgId] = useState('');
  const [userId, setUserId] = useState('');
  const [limit, setLimit] = useState(200);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), level });
      if (orgId.trim()) params.set('orgId', orgId.trim());
      if (userId.trim()) params.set('userId', userId.trim());
      const res = await fetch(`/api/superadmin/backend-logs?${params}`);
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
    }
  }, [level, orgId, userId, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(fetchLogs, 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  const levels = ['all', 'success', 'warning', 'error', 'info'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backend Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor API requests, responses, and errors in real time</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
          <div className="flex gap-1">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Org ID</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="Filter by org"
              className="pl-7 pr-6 py-1.5 text-xs border border-gray-200 rounded w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {orgId && <button onClick={() => setOrgId('')} className="absolute right-1.5 top-1/2 -translate-y-1/2"><X className="h-3 w-3 text-gray-400" /></button>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">User ID</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Filter by user"
              className="pl-7 pr-6 py-1.5 text-xs border border-gray-200 rounded w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {userId && <button onClick={() => setUserId('')} className="absolute right-1.5 top-1/2 -translate-y-1/2"><X className="h-3 w-3 text-gray-400" /></button>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Limit</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="py-1.5 px-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {[50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="ml-auto text-xs text-gray-400 self-end pb-1.5">{logs.length} records</div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2.5 text-left font-medium">Time</th>
                <th className="px-3 py-2.5 text-left font-medium">Method</th>
                <th className="px-3 py-2.5 text-left font-medium">Path</th>
                <th className="px-3 py-2.5 text-left font-medium">Status</th>
                <th className="px-3 py-2.5 text-left font-medium">Level</th>
                <th className="px-3 py-2.5 text-left font-medium">Duration</th>
                <th className="px-3 py-2.5 text-left font-medium">User</th>
                <th className="px-3 py-2.5 text-left font-medium">Organization</th>
                <th className="px-3 py-2.5 text-left font-medium">Role</th>
                <th className="px-3 py-2.5 text-left font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    {loading ? 'Loading…' : 'No logs found'}
                  </td>
                </tr>
              )}
              {logs.map((log) => (
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
                    <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate" title={log.userDisplayName ?? log.userId}>
                      {log.userDisplayName ?? log.userId ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate" title={log.organizationName ?? log.organizationId}>
                      {log.organizationName ?? (log.organizationId ? <span className="font-mono text-gray-400">{log.organizationId.slice(0, 8)}…</span> : <span className="text-gray-300">—</span>)}
                    </td>
                    <td className="px-3 py-2 text-gray-500 capitalize">{log.role?.replace(/_/g, ' ') ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-red-600 max-w-[180px] truncate" title={log.errorMessage}>{log.errorMessage ?? ''}</td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-expanded`} className="bg-blue-50">
                      <td colSpan={10} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold text-gray-600 mb-1">Details</p>
                            <dl className="space-y-0.5 text-xs">
                              <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">Log ID</dt><dd className="font-mono text-gray-600">{log.id}</dd></div>
                              <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">User ID</dt><dd className="font-mono text-gray-600">{log.userId ?? '—'}</dd></div>
                              <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">Org ID</dt><dd className="font-mono text-gray-600">{log.organizationId ?? '—'}</dd></div>
                              <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">Duration</dt><dd className="text-gray-600">{log.durationMs}ms</dd></div>
                              {log.errorMessage && <div className="flex gap-2"><dt className="text-gray-400 w-28 shrink-0">Error</dt><dd className="text-red-600">{log.errorMessage}</dd></div>}
                            </dl>
                          </div>
                          <div className="space-y-2">
                            {log.requestSummary && (
                              <div>
                                <p className="font-semibold text-gray-600 mb-1">Request</p>
                                <pre className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">{log.requestSummary}</pre>
                              </div>
                            )}
                            {log.responseSummary && (
                              <div>
                                <p className="font-semibold text-gray-600 mb-1">Response</p>
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
