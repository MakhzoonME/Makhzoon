'use client';
import { useT } from '@/hooks/ui';
import { useState, use, useCallback } from 'react';
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

export default function OrgAuditLogsPage(props: { params: Promise<{ orgId: string }> }) {
  const params = use(props.params);
  const { orgId } = params;
  const { t, locale } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    userId: searchParams.get('userId') ?? '',
    action: searchParams.get('action') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
  });
  const updateUrl = useCallback((newFilters: typeof filters) => {
    const qs = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => { if (v) qs.set(k, v); });
    router.replace(`${pathname}${qs.toString() ? '?' + qs.toString() : ''}`, { scroll: false });
  }, [pathname, router]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { data, isLoading } = useAuditLogs({ ...filters, orgId });
  const logs = data?.logs ?? [];

  const columns: ColumnDef<AuditLog>[] = [
    {
      key: 'timestamp',
      header: t('auditLogs.timestamp'),
      render: (l) => <span className="font-mono text-xs">{formatDateTime(l.timestamp)}</span>,
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
    const p = new URLSearchParams({ orgId });
    Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/api/audit-logs/export?${p.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title={t('nav.auditLogs')}
        breadcrumb={[
          { label: t('nav.organizations'), href: `/${locale}/superadmin` },
          { label: t('nav.auditLogs') },
        ]}
        actions={
          <Button size="sm" variant="outline" asChild>
            <a href={buildExportUrl()} download>{t('auditLogs.exportCsv')}</a>
          </Button>
        }
      />

      <div className="bg-surface-card rounded-lg border border-border p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'userId', label: t('auditLogs.userId') },
            { key: 'action', label: t('auditLogs.action') },
            { key: 'dateFrom', label: t('auditLogs.dateFrom'), type: 'date' },
            { key: 'dateTo', label: t('auditLogs.dateTo'), type: 'date' },
          ].map(({ key, label, type }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                type={type ?? 'text'}
                value={filters[key as keyof typeof filters]}
                onChange={(e) => {
                  const newFilters = { ...filters, [key]: e.target.value };
                  setFilters(newFilters);
                  updateUrl(newFilters);
                }}
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={logs}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('auditLogs.noLogs')}
          keyExtractor={(l) => l.id}
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
                {[
                  [t('auditLogs.action'), formatActionLabel(selectedLog.action)],
                  [t('auditLogs.module'), selectedLog.module],
                  [t('auditLogs.record'), selectedLog.recordName ?? selectedLog.recordId],
                  [t('auditLogs.user'), selectedLog.userDisplayName ?? selectedLog.userId],
                  [t('auditLogs.timestamp'), formatDateTime(selectedLog.timestamp)],
                ].filter(([, v]) => v).map(([k, v], i) => (
                  <div key={String(k)} className={`flex text-xs ${i % 2 === 0 ? 'bg-surface-page' : 'bg-surface-card'}`}>
                    <span className="w-28 flex-shrink-0 px-3 py-2 text-gray-500 font-medium border-r border-border">{k}</span>
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
