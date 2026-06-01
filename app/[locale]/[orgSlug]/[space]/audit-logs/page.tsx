'use client';
import { useState } from 'react';
import { useAuditLogs } from '@/hooks/org';
import { useTransferMode } from '@/hooks/ui';
import { useAuth } from '@/hooks/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatActionLabel, formatKeyLabel, formatAuditValue } from '@/lib/utils/audit-labels';
import { useT } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';

/* ── Before/After diff cards ─────────────────────────────────────── */
function DiffCards({ oldValue, newValue }: { oldValue?: Record<string, unknown> | null; newValue?: Record<string, unknown> | null }) {
  const { t } = useT();
  if (!oldValue && !newValue) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className="rounded-lg border p-3"
        style={{
          background: 'color-mix(in srgb, var(--red-600) 7%, var(--surface-card))',
          borderColor: 'var(--red-100)',
        }}
      >
        <div className="text-[11px] font-bold text-red-700 mb-2 uppercase tracking-wide">{t('auditLogs.before')}</div>
        <pre dir="ltr" className="m-0 font-mono text-[11.5px] text-gray-600 whitespace-pre-wrap break-all leading-relaxed">
          {oldValue ? JSON.stringify(oldValue, null, 2) : '{}'}
        </pre>
      </div>
      <div
        className="rounded-lg border p-3"
        style={{
          background: 'color-mix(in srgb, var(--green-600) 7%, var(--surface-card))',
          borderColor: 'var(--green-100)',
        }}
      >
        <div className="text-[11px] font-bold text-green-700 mb-2 uppercase tracking-wide">{t('auditLogs.after')}</div>
        <pre dir="ltr" className="m-0 font-mono text-[11.5px] text-gray-800 whitespace-pre-wrap break-all leading-relaxed">
          {newValue ? JSON.stringify(newValue, null, 2) : '{}'}
        </pre>
      </div>
    </div>
  );
}

/* ── Change summary (brief inline text) ─────────────────────────── */
function changeSummary(log: AuditLog): string | null {
  if (!log.oldValue && !log.newValue) return null;
  const keys = Object.keys({ ...log.oldValue, ...log.newValue });
  if (!keys.length) return null;
  if (keys.length === 1) {
    const k = keys[0];
    const before = formatAuditValue(log.oldValue?.[k]);
    const after = formatAuditValue(log.newValue?.[k]);
    return `${formatKeyLabel(k)}: ${before} → ${after}`;
  }
  return `+${keys.length} fields`;
}

export default function OrgAuditLogsPage() {
  const { t } = useT();
  const { user } = useAuth();
  const { orgId: transferOrgId } = useTransferMode();
  const orgId = user?.role === 'super_admin' ? (transferOrgId ?? undefined) : undefined;
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ userId: '', action: '', dateFrom: '', dateTo: '' });
  const [scope, setScope] = useState<'space' | 'all'>('space');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading } = useAuditLogs({ ...filters, orgId, page, pageSize, scope });
  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function handleFilterChange(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const detailRows = selectedLog ? [
    [t('auditLogs.action'), formatActionLabel(selectedLog.action)],
    [t('auditLogs.module'), selectedLog.module],
    [t('auditLogs.record'), selectedLog.recordName ?? selectedLog.recordId],
    [t('auditLogs.user'), selectedLog.userDisplayName ?? selectedLog.userId],
    [t('auditLogs.timestamp'), formatDateTime(selectedLog.timestamp)],
  ] : [];

  const columns: ColumnDef<AuditLog>[] = [
    {
      key: 'action',
      header: t('auditLogs.action'),
      render: (l) => (
        <span
          dir="ltr"
          className="font-mono text-[11px] px-[7px] py-[3px] rounded"
          style={{
            background: 'var(--primary-50)',
            color: 'var(--primary-700)',
          }}
        >
          {l.action}
        </span>
      ),
    },
    {
      key: 'module',
      header: t('auditLogs.module'),
      render: (l) => <span className="text-xs text-gray-500 capitalize">{l.module}</span>,
    },
    {
      key: 'userId',
      header: t('auditLogs.actor'),
      render: (l) => <span className="text-xs font-semibold text-gray-800">{l.userDisplayName ?? l.userId}</span>,
    },
    {
      key: 'recordId',
      header: t('auditLogs.record'),
      render: (l) => <span className="font-mono text-xs text-gray-700">{l.recordName ?? l.recordId}</span>,
    },
    {
      key: 'change',
      header: t('auditLogs.change'),
      render: (l) => {
        const s = changeSummary(l);
        return s ? <span className="text-xs text-gray-500 dir-ltr">{s}</span> : <span className="text-xs text-gray-300">—</span>;
      },
    },
    ...(scope === 'all' ? [{
      key: 'space',
      header: t('auditLogs.space'),
      render: (l: AuditLog) => l.spaceName ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-sidebar text-gray-600 border border-border">
          {l.spaceName}
        </span>
      ) : <span className="text-xs text-gray-400">—</span>,
    }] : []),
    {
      key: 'timestamp',
      header: t('auditLogs.time'),
      render: (l) => <span className="font-mono text-xs text-gray-400">{formatDateTime(l.timestamp)}</span>,
    },
    {
      key: 'details',
      header: '',
      render: (l) => (
        <Button
          size="sm"
          variant="ghost"
          className="cursor-pointer transition-colors duration-150"
          onClick={(e) => { e.stopPropagation(); setSelectedLog(l); }}
        >
          {t('auditLogs.details')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t('nav.auditLogs')} />

      <div className="bg-surface-card rounded-lg border border-border p-4 mb-4 space-y-3">
        {/* Scope toggle + immutable note */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {(user?.role === 'admin' || user?.role === 'org_owner') && (
            <div className="inline-flex items-center rounded-md border border-border p-0.5 bg-surface-page">
              <button
                type="button"
                onClick={() => { setScope('space'); setPage(1); }}
                className={cn('px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer', scope === 'space' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-surface-card')}
              >
                {t('auditLogs.scopeSpace')}
              </button>
              <button
                type="button"
                onClick={() => { setScope('all'); setPage(1); }}
                className={cn('px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer', scope === 'all' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-surface-card')}
              >
                {t('auditLogs.scopeAll')}
              </button>
            </div>
          )}
          <span className="text-[12.5px] text-gray-400">{t('auditLogs.immutableNote')}</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-[320px]">
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange('action', e.target.value); }}
              placeholder={t('auditLogs.searchPlaceholder')}
              className="h-8 text-xs"
            />
          </div>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="h-8 text-xs w-36"
            title={t('auditLogs.dateFrom')}
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="h-8 text-xs w-36"
            title={t('auditLogs.dateTo')}
          />
          <Input
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            placeholder={t('auditLogs.userId')}
            className="h-8 text-xs w-36"
          />
        </div>
      </div>

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={logs}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('auditLogs.noLogs')}
          keyExtractor={(l) => l.id}
          pagination={{
            page,
            pageSize,
            total,
            totalPages,
            onPageChange: setPage,
            onPageSizeChange: (newSize) => { setPageSize(newSize); setPage(1); },
          }}
        />
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('auditLogs.detail')}</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-[14px] px-6 py-4">
              {/* Meta rows */}
              <div className="rounded-lg border border-border overflow-hidden">
                {detailRows.filter(([, v]) => v).map(([k, v], i) => (
                  <div key={String(k)} className={cn('flex text-xs', i % 2 === 0 ? 'bg-surface-page' : 'bg-surface-card')}>
                    <span className="w-28 flex-shrink-0 px-3 py-2 text-gray-500 font-medium border-r border-border">{k}</span>
                    <span className="px-3 py-2 text-gray-800">{String(v)}</span>
                  </div>
                ))}
              </div>
              {/* Before/After diff */}
              {(selectedLog.oldValue || selectedLog.newValue) && (
                <DiffCards oldValue={selectedLog.oldValue} newValue={selectedLog.newValue} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
