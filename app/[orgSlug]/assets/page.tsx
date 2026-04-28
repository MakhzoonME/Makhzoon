'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useAssets } from '@/hooks/useAssets';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExportButton } from '@/components/shared/ExportButton';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { AssetForm } from '@/components/assets/AssetForm';
import { ImportAssetsDrawer } from '@/components/assets/ImportAssetsDrawer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset } from '@/types';
import { formatDate } from '@/lib/utils/date';
function PlusSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function EditSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /></svg>; }
function ArchiveXSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><rect x="1" y="1.5" width="12" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M2 4.5v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M5.5 7l3 3M8.5 7l-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function Trash2SVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function UploadSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 10V3M5 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';

export default function AssetsPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [actionTarget, setActionTarget] = useState<Asset | null>(null);
  const [actioning, setActioning] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const { data: assetsData, isLoading } = useAssets({ status: status || undefined, search: debouncedSearch });
  const assets = assetsData?.items ?? [];

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const columns: ColumnDef<Asset>[] = [
    {
      key: 'name', header: 'Name',
      render: (a) => <button className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline text-left" onClick={() => router.push(`/${orgSlug}/assets/${a.id}`)}>{a.name}</button>
    },
    { key: 'category', header: 'Category', render: (a) => a.category },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'serial', header: 'Serial Number', render: (a) => a.serialNumber ? <span className="font-mono text-xs text-gray-600">{a.serialNumber}</span> : <span className="text-gray-400">—</span> },
    { key: 'assignedTo', header: 'Assigned To', render: (a) => a.assignedTo || <span className="text-gray-400">—</span> },
    { key: 'location', header: 'Location', render: (a) => a.location || <span className="text-gray-400">—</span> },
    { key: 'purchaseDate', header: 'Purchase Date', render: (a) => a.purchaseDate ? formatDate(a.purchaseDate) : <span className="text-gray-400">—</span> },
    {
      key: 'actions', header: 'Actions',
      render: (a) => (
        <div className="flex items-center gap-1">
          {isAdmin ? (
            <>
              {a.status !== 'Retired' && (
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditTarget(a); setDrawerOpen(true); }}>
                  <EditSVG />
                </Button>
              )}
              {a.status === 'Active' && (
                <Button size="sm" variant="ghost" className="text-amber-500 hover:text-amber-600 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); setActionTarget(a); }}
                  title="Retire asset">
                  <ArchiveXSVG />
                </Button>
              )}
              {a.status === 'Retired' && (
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setActionTarget(a); }}
                  title="Delete permanently">
                  <Trash2SVG />
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/${orgSlug}/assets/${a.id}`); }}>View</Button>
          )}
        </div>
      )
    },
  ];

  async function handleAction() {
    if (!actionTarget) return;
    setActioning(true);
    const isRetired = actionTarget.status === 'Retired';
    try {
      await fetch(`/api/assets/${actionTarget.id}`, { method: 'DELETE' });
      toast.success(isRetired ? 'Asset deleted' : 'Asset retired');
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.removeQueries({ queryKey: ['assets', actionTarget.id] });

      setActionTarget(null);
    } catch {
      toast.error(isRetired ? 'Failed to delete asset' : 'Failed to retire asset');
    } finally {
      setActioning(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        actions={isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <UploadSVG /><span className="ml-1">Import CSV</span>
            </Button>
            <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}>
              <PlusSVG /><span className="ml-1">Add Asset</span>
            </Button>
          </div>
        ) : undefined}
      />

      <FilterBar
        searchPlaceholder="Search by name..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={isAdmin ? <ExportButton exportUrl="/api/assets/export" filename={`assets-${format(new Date(), 'yyyy-MM-dd')}.csv`} /> : undefined}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={assets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No assets found."
          onRowClick={(a) => router.push(`/${orgSlug}/assets/${a.id}`)}
          keyExtractor={(a) => a.id}
        />
      </div>

      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && setActionTarget(null)}
        title={actionTarget?.status === 'Retired' ? 'Delete Asset Permanently' : 'Retire Asset'}
        description={actionTarget?.status === 'Retired'
          ? `Permanently delete "${actionTarget?.name}"? This cannot be undone.`
          : `Are you sure you want to retire "${actionTarget?.name}"? This will mark it as inactive.`}
        confirmLabel={actionTarget?.status === 'Retired' ? 'Delete Permanently' : 'Retire'}
        onConfirm={handleAction}
        loading={actioning}
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(o) => { setDrawerOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? 'Edit Asset' : 'Add Asset'}
      >
        <AssetForm
          asset={editTarget ?? undefined}
          onSuccess={() => setDrawerOpen(false)}
        />
      </FormDrawer>

      <ImportAssetsDrawer open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
