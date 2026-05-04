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

export default function OrgAuditLogsPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params;
  const [filters, setFilters] = useState({ userId: '', action: '', dateFrom: '', dateTo: '' });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { data, isLoading } = useAuditLogs({ ...filters, orgId });
  const logs = data?.logs ?? [];

  const columns: ColumnDef<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (l) => <span className="font-mono text-xs">{formatDateTime(l.timestamp)}</span>,
    },
    {
      key: 'userId',
      header: 'User',
      render: (l) => <span className="text-xs">{l.userDisplayName ?? l.userId}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => <span className="text-xs font-medium">{formatActionLabel(l.action)}</span>,
    },
    {
      key: 'module',
      header: 'Module',
      render: (l) => <span className="text-xs capitalize">{l.module}</span>,
    },
    {
      key: 'recordId',
      header: 'Record',
      render: (l) => <span className="text-xs text-gray-700">{l.recordName ?? l.recordId}</span>,
    },
    {
      key: 'details',
      header: '',
      render: (l) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedLog(l); }}>
          Details
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
        title="Organization Audit Logs"
        breadcrumb={[
          { label: 'Organizations', href: '/superadmin' },
          { label: 'Audit Logs', href: '' },
        ]}
        actions={
          <Button size="sm" variant="outline" asChild>
            <a href={buildExportUrl()} download>Export CSV</a>
          </Button>
        }
      />

      <div className="bg-surface-card rounded-lg border border-border p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'userId', label: 'User ID' },
            { key: 'action', label: 'Action' },
            { key: 'dateFrom', label: 'Date From', type: 'date' },
            { key: 'dateTo', label: 'Date To', type: 'date' },
          ].map(({ key, label, type }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                type={type ?? 'text'}
                value={filters[key as keyof typeof filters]}
                onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
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
          emptyMessage="No audit logs found for this organization."
          keyExtractor={(l) => l.id}
        />
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-[14px] px-6 py-4">
              <div className="rounded-lg border border-border overflow-hidden">
                {[
                  ['Action', formatActionLabel(selectedLog.action)],
                  ['Module', selectedLog.module],
                  ['Record', selectedLog.recordName ?? selectedLog.recordId],
                  ['User', selectedLog.userDisplayName ?? selectedLog.userId],
                  ['Timestamp', formatDateTime(selectedLog.timestamp)],
                ].filter(([, v]) => v).map(([k, v], i) => (
                  <div key={String(k)} className={`flex text-xs ${i % 2 === 0 ? 'bg-gray-50' : 'bg-surface-card'}`}>
                    <span className="w-28 flex-shrink-0 px-3 py-2 text-gray-500 font-medium border-r border-border">{k}</span>
                    <span className="px-3 py-2 text-gray-800">{String(v)}</span>
                  </div>
                ))}
              </div>
              {selectedLog.oldValue && (
                <ChangesTable label="Previous Values" value={selectedLog.oldValue} />
              )}
              {selectedLog.newValue && (
                <ChangesTable label="New Values" value={selectedLog.newValue} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
