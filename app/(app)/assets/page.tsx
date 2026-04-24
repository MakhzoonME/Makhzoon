'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssets } from '@/hooks/useAssets';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExportButton } from '@/components/shared/ExportButton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { Plus, Edit, ArchiveX, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';

export default function AssetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [retireTarget, setRetireTarget] = useState<Asset | null>(null);
  const [retiring, setRetiring] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const { data: assetsData, isLoading } = useAssets({ status: status || undefined, search: debouncedSearch });
  const assets = assetsData?.items ?? [];

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const columns: ColumnDef<Asset>[] = [
    {
      key: 'name', header: 'Name',
      render: (a) => <button className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline text-left" onClick={() => router.push(`/assets/${a.id}`)}>{a.name}</button>
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
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/assets/${a.id}/edit`); }}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              {a.status === 'Active' && (
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setRetireTarget(a); }}>
                  <ArchiveX className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/assets/${a.id}`); }}>View</Button>
          )}
        </div>
      )
    },
  ];

  async function handleRetire() {
    if (!retireTarget) return;
    setRetiring(true);
    try {
      await fetch(`/api/assets/${retireTarget.id}`, { method: 'DELETE' });
      toast.success('Asset retired');
      qc.invalidateQueries({ queryKey: ['assets'] });
      setRetireTarget(null);
    } catch {
      toast.error('Failed to retire asset');
    } finally {
      setRetiring(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        actions={isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push('/assets/import')}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
            <Button size="sm" onClick={() => router.push('/assets/new')}>
              <Plus className="h-4 w-4 mr-1" /> Add Asset
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
          onRowClick={(a) => router.push(`/assets/${a.id}`)}
          keyExtractor={(a) => a.id}
        />
      </div>

      <ConfirmDialog
        open={!!retireTarget}
        onOpenChange={(o) => !o && setRetireTarget(null)}
        title="Retire Asset"
        description={`Are you sure you want to retire "${retireTarget?.name}"? This will mark it as inactive.`}
        confirmLabel="Retire"
        onConfirm={handleRetire}
        loading={retiring}
      />
    </div>
  );
}
