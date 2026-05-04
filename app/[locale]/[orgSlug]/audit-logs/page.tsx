'use client';
import { useState } from 'react';
import { useAuditLogs } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatActionLabel, formatKeyLabel } from '@/lib/utils/audit-labels';
import { useT } from '@/hooks/ui';

function ChangesTable({ label, value }: { label: string; value: Record<string, unknown> }) {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="rounded-lg border border-border overflow-hidden">
        {entries.map(([k, v], i) => (
          <div key={k} className={`flex text-xs ${i % 2 === 0 ? 'bg-gray-50' : 'bg-surface-card'}`}>
            <span className="w-40 flex-shrink-0 px-3 py-2 text-gray-500 font-medium border-r border-border">
              {formatKeyLabel(k)}
            </span>
            <span className="px-3 py-2 text-gray-800 break-all">
              {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrgAuditLogsPage() {
  const { t } = useT();
  const [filters, setFilters] = useState({ userId: '', action: '', dateFrom: '', dateTo: '' });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading } = useAuditLogs({ ...filters, page, pageSize });
  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const filterFields = [
    { key: 'userId', label: t('auditLogs.userId') },
    { key: 'action', label: t('auditLogs.action') },
    { key: 'dateFrom', label: t('auditLogs.dateFrom'), type: 'date' },
    { key: 'dateTo', label: t('auditLogs.dateTo'), type: 'date' },
  ];

  function handleFilterChange(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const columns: ColumnDef<AuditLog>[] = [
    {
      key: 'timestamp',
      header: t('auditLogs.timestamp'),
      render: (l) => <span className="font-mono text-xs">{formatDateTime(l.timestamp)}</span>,
    },
    {
      key: 'userId',
      header: t('auditLogs.user'),
      render: (l) => (
        <span className="text-xs">{l.userDisplayName ?? l.userId}</span>
      ),
    },
    {
      key: 'action',
      header: t('auditLogs.action'),
      render: (l) => (
        <span className="text-xs font-medium">{formatActionLabel(l.action)}</span>
      ),
    },
    { key: 'module', header: t('auditLogs.module'), render: (l) => <span className="text-xs capitalize">{l.module}</span> },
    {
      key: 'recordId',
      header: t('auditLogs.record'),
      render: (l) => (
        <span className="text-xs text-gray-700">{l.recordName ?? l.recordId}</span>
      ),
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

  const detailRows = selectedLog ? [
    [t('auditLogs.action'), formatActionLabel(selectedLog.action)],
    [t('auditLogs.module'), selectedLog.module],
    [t('auditLogs.record'), selectedLog.recordName ?? selectedLog.recordId],
    [t('auditLogs.user'), selectedLog.userDisplayName ?? selectedLog.userId],
    [t('auditLogs.timestamp'), formatDateTime(selectedLog.timestamp)],
  ] : [];

  return (
    <div>
      <PageHeader title={t('nav.auditLogs')} />

      <div className="bg-surface-card rounded-lg border border-border p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {filterFields.map(({ key, label, type }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                type={type ?? 'text'}
                value={filters[key as keyof typeof filters]}
                onChange={(e) => handleFilterChange(key, e.target.value)}
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('auditLogs.detail')}</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-[14px] px-6 py-4">
              <div className="rounded-lg border border-border overflow-hidden">
                {detailRows.filter(([, v]) => v).map(([k, v], i) => (
                  <div key={String(k)} className={`flex text-xs ${i % 2 === 0 ? 'bg-gray-50' : 'bg-surface-card'}`}>
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
