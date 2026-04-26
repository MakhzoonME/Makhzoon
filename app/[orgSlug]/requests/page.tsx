'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useRequests } from '@/hooks/useRequests';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Request } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { truncate } from '@/lib/utils/format';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
function CheckSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const typeLabels: Record<string, string> = {
  REFILL: 'Refill',
  RETIRE: 'Retire',
  BUY_NEW: 'Buy New',
  EXTEND_WARRANTY: 'Extend Warranty',
};

export default function RequestsPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { data: requests = [], isLoading } = useRequests();
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleDecision(requestId: string, action: 'approve' | 'reject') {
    setProcessing(requestId);
    try {
      const res = await fetch(`/api/requests/${requestId}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed to ${action} request`);
      }
      toast.success(action === 'approve' ? 'Request approved successfully' : 'Request rejected');
      qc.invalidateQueries({ queryKey: ['requests'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  }

  const columns: ColumnDef<Request>[] = [
    { key: 'type', header: 'Type', render: (r) => <span className="font-medium text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{typeLabels[r.type] ?? r.type}</span> },
    {
      key: 'assetId', header: 'Reference',
      render: (r) => {
        if (r.assetId) return <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/${orgSlug}/assets/${r.assetId}`)}>{r.assetName ?? r.assetId}</button>;
        if (r.inventoryItemId) return <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/${orgSlug}/inventory/${r.inventoryItemId}`)}>{r.inventoryItemName ?? r.inventoryItemId}</button>;
        return <span className="text-gray-400">—</span>;
      }
    },
    { key: 'createdBy', header: 'Submitted By', render: (r) => r.createdByName ?? r.createdByEmail ?? r.createdBy },
    { key: 'createdAt', header: 'Date', render: (r) => formatDate(r.createdAt) },
    { key: 'description', header: 'Description', render: (r) => <span className="text-gray-600">{truncate(r.description, 60)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions',
      render: (r) => isAdmin && r.status === 'PENDING' ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'approve'); }}>
            <CheckSVG />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'reject'); }}>
            <XSVG />
          </Button>
        </div>
      ) : null
    },
  ];

  return (
    <div>
      <PageHeader title="Requests" />
      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable data={requests} columns={columns} isLoading={isLoading} emptyMessage="No requests found." keyExtractor={(r) => r.id} />
      </div>
    </div>
  );
}
