'use client';
import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuditLogs } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatActionLabel, formatKeyLabel, formatAuditValue } from '@/lib/utils/audit-labels';
import { useT } from '@/hooks/ui';

function ChangesTable({ label, value }: { label: string; value: Record<string, unknown> }) {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="rounded-lg border border-border overflow-hidden">
        {entries.map(([k, v], i) => (
          <div key={k} className={`flex text-xs ${i % 2 === 0 ? 'bg-surface-page' : 'bg-surface-card'}`}>
            <span className="w-40 flex-shrink-0 px-3 py-2 text-gray-500 font-medium border-r border-border">
              {formatKeyLabel(k)}
            </span>
            <span className="px-3 py-2 text-gray-800 break-all">{formatAuditValue(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

export default function AuditLogsPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const orgId = searchParams.get('orgId') ?? '';
  const userId = searchParams.get('userId') ?? '';
  const action = searchParams.get('action') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const params = {
    orgId: orgId || undefined,
    userId: userId || undefined,
    action: action || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize,
  };

  const { data, isLoading } = useAuditLogs(params);
  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const updateUrl = useCallback((p: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, p);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  function syncAllToUrl(next: Partial<Record<'orgId' | 'userId' | 'action' | 'dateFrom' | 'dateTo' | 'page' | 'pageSize', string>>) {
    updateUrl({
      orgId: next.orgId ?? orgId,
      userId: next.userId ?? userId,
      action: next.action ?? action,
      dateFrom: next.dateFrom ?? dateFrom,
      dateTo: next.dateTo ?? dateTo,
      page: next.page ?? String(page),
      pageSize: next.pageSize ?? String(pageSize),
    });
  }

  function handleFilterChange(key: string, value: string) {
    syncAllToUrl({ [key]: value, page: '1' });
  }

  function clearFilters() {
    syncAllToUrl({ orgId: '', userId: '', action: '', dateFrom: '', dateTo: '', page: '1' });
  }

  const hasActiveFilters = orgId || userId || action || dateFrom || dateTo;

  const columns: ColumnDef<AuditLog>[] = [
    {
      key: 'timestamp',
      header: t('auditLogs.timestamp'),
      render: (l) => <span className="font-mono text-xs">{formatDateTime(l.timestamp)}</span>,
    },
    {
      key: 'orgId',
      header: t('auditLogs.organization'),
      render: (l) => <span className="text-xs">{l.orgName ?? l.organizationId}</span>,
    },
    {
      key: 'userId',
      header: t('auditLogs.user'),
      render: (l) => <span className="text-xs">{l.userDisplayName ?? l.userId}</span>,
    },
    {
      key: 'action',
      header: t('auditLogs.action'),
      render: (l) => <span className="text-xs font-medium">{formatActionLabel(l.action)}</span>,
    },
    {
      key: 'module',
      header: t('auditLogs.module'),
      render: (l) => <span className="text-xs capitalize">{l.module}</span>,
    },
    {
      key: 'recordId',
      header: t('auditLogs.record'),
      render: (l) => <span className="text-xs text-gray-700">{l.recordName ?? l.recordId}</span>,
    },
    {
      key: 'details',
      header: '',
      render: (l) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedLog(l); }}>
          {t('auditLogs.details')}
        </Button>
      ),
    },
  ];

  function buildExportUrl() {
    const p = new URLSearchParams();
    if (orgId) p.set('orgId', orgId);
    if (userId) p.set('userId', userId);
    if (action) p.set('action', action);
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    return `/api/audit-logs/export?${p.toString()}`;
  }

  const detailRows = selectedLog ? [
    [t('auditLogs.action'), formatActionLabel(selectedLog.action)],
    [t('auditLogs.module'), selectedLog.module],
    [t('auditLogs.record'), selectedLog.recordName ?? selectedLog.recordId],
    [t('auditLogs.user'), selectedLog.userDisplayName ?? selectedLog.userId],
    [t('auditLogs.organization'), selectedLog.orgName ?? selectedLog.organizationId],
    [t('auditLogs.timestamp'), formatDateTime(selectedLog.timestamp)],
    ...(selectedLog.transferMode ? [[t('auditLogs.transferMode'), 'Yes']] : []),
  ] : [];

  return (
    <div>
      <PageHeader
        title={t('nav.auditLogs')}
        breadcrumb={[{ label: t('nav.auditLogs') }]}
        actions={
          <Button size="sm" variant="outline" asChild>
            <a href={buildExportUrl()} download>{t('auditLogs.exportCsv')}</a>
          </Button>
        }
      />

      <div className="bg-surface-card rounded-lg border border-border p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key: 'orgId', label: t('auditLogs.orgId'), type: 'text' },
            { key: 'userId', label: t('auditLogs.user'), type: 'text' },
            { key: 'action', label: t('auditLogs.action'), type: 'text' },
            { key: 'dateFrom', label: t('auditLogs.dateFrom'), type: 'date' },
            { key: 'dateTo', label: t('auditLogs.dateTo'), type: 'date' },
          ].map(({ key, label, type }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                type={type}
                value={(key === 'orgId' ? orgId : key === 'userId' ? userId : key === 'action' ? action : key === 'dateFrom' ? dateFrom : dateTo) as string}
                onChange={(e) => handleFilterChange(key, e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-xs text-gray-400">
            {total} total record{total !== 1 ? 's' : ''}
          </span>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} className="h-7 text-xs text-gray-500">
              {t('backendLogs.clearFilters')}
            </Button>
          )}
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
            onPageChange: (p) => syncAllToUrl({ page: String(p) }),
            onPageSizeChange: (s) => syncAllToUrl({ pageSize: String(s), page: '1' }),
          }}
        />
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('auditLogs.detail')}</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-[14px] px-6 py-4">
              <div className="rounded-lg border border-border overflow-hidden">
                {(detailRows as [string, string][]).filter(([, v]) => v).map(([k, v], i) => (
                  <div key={String(k)} className={`flex text-xs ${i % 2 === 0 ? 'bg-surface-page' : 'bg-surface-card'}`}>
                    <span className="w-32 flex-shrink-0 px-3 py-2 text-gray-500 font-medium border-r border-border">{k}</span>
                    <span className="px-3 py-2 text-gray-800">{String(v)}</span>
                  </div>
                ))}
              </div>
              {selectedLog.oldValue && (
                <ChangesTable label={t('auditLogs.previousValues')} value={selectedLog.oldValue} />
              )}
              {selectedLog.newValue && (
                <ChangesTable label={t('auditLogs.newValues')} value={selectedLog.newValue} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
