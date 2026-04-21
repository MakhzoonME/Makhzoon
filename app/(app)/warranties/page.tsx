'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWarranties } from '@/hooks/useWarranties';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExportButton } from '@/components/shared/ExportButton';
import { Button } from '@/components/ui/button';
import { Warranty } from '@/types';
import { formatDate, isExpired, isExpiringSoon } from '@/lib/utils/date';
import { Plus, Edit, Trash2, Check } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

function getWarrantyStatus(w: Warranty): string {
  if (isExpired(w.endDate)) return 'Expired';
  if (isExpiringSoon(w.endDate)) return 'Expiring Soon';
  return 'Active';
}

export default function WarrantiesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Warranty | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: warranties = [], isLoading } = useWarranties();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const columns: ColumnDef<Warranty>[] = [
    { key: 'assetId', header: 'Asset', render: (w) => <button className="text-blue-600 hover:underline" onClick={() => router.push(`/assets/${w.assetId}`)}>{w.assetId}</button> },
    { key: 'vendor', header: 'Vendor', render: (w) => w.vendor },
    { key: 'startDate', header: 'Start Date', render: (w) => formatDate(w.startDate) },
    { key: 'endDate', header: 'End Date', render: (w) => <span className={isExpired(w.endDate) ? 'text-red-600' : ''}>{formatDate(w.endDate)}</span> },
    { key: 'reminder', header: 'Reminder', render: (w) => w.reminder ? <Check className="h-4 w-4 text-green-600" /> : <span className="text-gray-400">—</span> },
    { key: 'status', header: 'Status', render: (w) => <StatusBadge status={getWarrantyStatus(w)} /> },
    {
      key: 'actions', header: 'Actions',
      render: (w) => (
        <div className="flex gap-1">
          {isAdmin ? (
            <>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/warranties/${w.id}/edit`); }}><Edit className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteTarget(w); }}><Trash2 className="h-3.5 w-3.5" /></Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => router.push(`/assets/${w.assetId}`)}>View Asset</Button>
          )}
        </div>
      )
    },
  ];

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/warranties/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Warranty deleted');
      qc.invalidateQueries({ queryKey: ['warranties'] });
      setDeleteTarget(null);
    } catch { toast.error('Failed to delete warranty'); }
    finally { setDeleting(false); }
  }

  return (
    <div>
      <PageHeader
        title="Warranties"
        actions={isAdmin ? <Button size="sm" onClick={() => router.push('/warranties/new')}><Plus className="h-4 w-4 mr-1" />Add Warranty</Button> : undefined}
      />

      <FilterBar
        actions={isAdmin ? <ExportButton exportUrl="/api/warranties/export" filename={`warranties-${format(new Date(), 'yyyy-MM-dd')}.csv`} /> : undefined}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable data={warranties} columns={columns} isLoading={isLoading} emptyMessage="No warranties found." keyExtractor={(w) => w.id} />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Warranty"
        description={`Delete warranty from "${deleteTarget?.vendor}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
