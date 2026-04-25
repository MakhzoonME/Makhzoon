'use client';
import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils/date';
import { truncate } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function OrgAuditLogsPage() {
  const [filters, setFilters] = useState({ userId: '', action: '', dateFrom: '', dateTo: '' });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { data, isLoading } = useAuditLogs(filters);
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
      render: (l) => <span className="text-xs">{l.userId}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{l.action}</span>
      ),
    },
    { key: 'module', header: 'Module', render: (l) => l.module },
    {
      key: 'recordId',
      header: 'Record ID',
      render: (l) => <span className="font-mono text-xs text-gray-500">{truncate(l.recordId, 12)}</span>,
    },
    {
      key: 'details',
      header: '',
      render: (l) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); setSelectedLog(l); }}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" />

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
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

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={logs}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No audit logs found."
          keyExtractor={(l) => l.id}
        />
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              {([
                ['Action', selectedLog.action],
                ['Module', selectedLog.module],
                ['Record ID', selectedLog.recordId],
                ['User ID', selectedLog.userId],
                ['Timestamp', formatDateTime(selectedLog.timestamp)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-gray-500 w-28 flex-shrink-0">{k}</span>
                  <span className="font-medium font-mono text-xs">{v}</span>
                </div>
              ))}
              {selectedLog.oldValue && (
                <div>
                  <p className="text-gray-500 mb-1 font-semibold text-xs uppercase">Old Value</p>
                  <pre className="bg-gray-50 border border-gray-200 rounded p-2 text-xs overflow-auto">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.newValue && (
                <div>
                  <p className="text-gray-500 mb-1 font-semibold text-xs uppercase">New Value</p>
                  <pre className="bg-gray-50 border border-gray-200 rounded p-2 text-xs overflow-auto">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
