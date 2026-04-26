'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useWarranties } from '@/hooks/useWarranties';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExportButton } from '@/components/shared/ExportButton';
import { Button } from '@/components/ui/button';
import { Warranty } from '@/types';
import { formatDate, isExpired, getWarrantyStatus } from '@/lib/utils/date';
function PlusSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function EditSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /></svg>; }
function Trash2SVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function CheckSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
import { FormDrawer } from '@/components/shared/FormDrawer';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function WarrantiesPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Warranty | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Warranty | null>(null);

  const { data: warranties = [], isLoading } = useWarranties();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const columns: ColumnDef<Warranty>[] = [
    { key: 'assetId', header: 'Asset', render: (w) => <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/${orgSlug}/assets/${w.assetId}`)}>{w.assetName ?? w.assetId}</button> },
    { key: 'vendor', header: 'Vendor', render: (w) => w.vendor },
    { key: 'startDate', header: 'Start Date', render: (w) => formatDate(w.startDate) },
    { key: 'endDate', header: 'End Date', render: (w) => <span className={isExpired(w.endDate) ? 'text-red-600' : ''}>{formatDate(w.endDate)}</span> },
    { key: 'reminder', header: 'Reminder', render: (w) => w.reminder ? <span className="text-green-600"><CheckSVG /></span> : <span className="text-gray-400">—</span> },
    { key: 'status', header: 'Status', render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: 'Actions',
      render: (w) => (
        <div className="flex gap-1">
          {isAdmin ? (
            <>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditTarget(w); setDrawerOpen(true); }}><EditSVG /></Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteTarget(w); }}><Trash2SVG /></Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => router.push(`/${orgSlug}/assets/${w.assetId}`)}>View Asset</Button>
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
        actions={isAdmin ? <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}><PlusSVG /><span className="ml-1">Add Warranty</span></Button> : undefined}
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

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(o) => { setDrawerOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? 'Edit Warranty' : 'Add Warranty'}
      >
        <WarrantyForm
          warranty={editTarget ?? undefined}
          onSuccess={() => setDrawerOpen(false)}
        />
      </FormDrawer>
    </div>
  );
}
