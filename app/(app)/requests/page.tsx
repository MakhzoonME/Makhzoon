'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Check, X } from 'lucide-react';

const typeLabels: Record<string, string> = {
  REFILL: 'Refill',
  RETIRE: 'Retire',
  BUY_NEW: 'Buy New',
  EXTEND_WARRANTY: 'Extend Warranty',
};

export default function RequestsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { data: requests = [], isLoading } = useRequests();
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleDecision(requestId: string, action: 'approve' | 'reject') {
    setProcessing(requestId);
    try {
      await fetch(`/api/requests/${requestId}/${action}`, { method: 'POST' });
      toast.success(action === 'approve' ? 'Request approved' : 'Request rejected');
      qc.invalidateQueries({ queryKey: ['requests'] });
    } catch { toast.error('Failed to process request'); }
    finally { setProcessing(null); }
  }

  const columns: ColumnDef<Request>[] = [
    { key: 'type', header: 'Type', render: (r) => <span className="font-medium text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{typeLabels[r.type] ?? r.type}</span> },
    { key: 'assetId', header: 'Asset', render: (r) => r.assetId ? <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/assets/${r.assetId}`)}>{r.assetName ?? r.assetId}</button> : <span className="text-gray-400">—</span> },
    { key: 'createdBy', header: 'Submitted By', render: (r) => r.createdByName ?? r.createdByEmail ?? r.createdBy },
    { key: 'createdAt', header: 'Date', render: (r) => formatDate(r.createdAt) },
    { key: 'description', header: 'Description', render: (r) => <span className="text-gray-600">{truncate(r.description, 60)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions',
      render: (r) => isAdmin && r.status === 'PENDING' ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'approve'); }}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'reject'); }}>
            <X className="h-4 w-4" />
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
