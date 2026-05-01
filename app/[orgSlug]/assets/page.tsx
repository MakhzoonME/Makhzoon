'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Pencil, ArchiveX, Trash2, Upload } from 'lucide-react';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useAssets } from '@/hooks/useAssets';
import { useAuthStore } from '@/store/auth.store';
import { useT } from '@/hooks/useT';
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
  const { t } = useT();

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
      key: 'name', header: t('col.name'),
      render: (a) => <button className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline text-left" onClick={() => router.push(`/${orgSlug}/assets/${a.id}`)}>{a.name}</button>
    },
    { key: 'category', header: t('col.category'), render: (a) => a.category },
    { key: 'status', header: t('col.status'), render: (a) => <StatusBadge status={a.status} /> },
    { key: 'serial', header: t('col.serialNumber'), render: (a) => a.serialNumber ? <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{a.serialNumber}</span> : <span className="text-gray-400">—</span> },
    { key: 'assignedTo', header: t('col.assignedTo'), render: (a) => a.assignedTo || <span className="text-gray-400">—</span> },
    { key: 'location', header: t('col.location'), render: (a) => a.location || <span className="text-gray-400">—</span> },
    { key: 'purchaseDate', header: t('col.purchaseDate'), render: (a) => a.purchaseDate ? formatDate(a.purchaseDate) : <span className="text-gray-400">—</span> },
    {
      key: 'actions', header: t('col.actions'),
      render: (a) => (
        <div className="flex items-center gap-1">
          {isAdmin ? (
            <>
              {a.status !== 'Retired' && (
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditTarget(a); setDrawerOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
              {a.status === 'Active' && (
                <Button size="sm" variant="ghost" className="text-amber-500 hover:text-amber-600 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); setActionTarget(a); }}
                  title={t('assets.retire')}>
                  <ArchiveX className="w-3.5 h-3.5" />
                </Button>
              )}
              {a.status === 'Retired' && (
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setActionTarget(a); }}
                  title={t('assets.deleteBtn')}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/${orgSlug}/assets/${a.id}`); }}>{t('assets.view')}</Button>
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
      toast.success(isRetired ? t('assets.deleteDone') : t('assets.retireDone'));
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.removeQueries({ queryKey: ['assets', actionTarget.id] });
      setActionTarget(null);
    } catch {
      toast.error(isRetired ? t('assets.deleteFail') : t('assets.retireFail'));
    } finally {
      setActioning(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('nav.assets')}
        actions={isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4" /><span className="ms-1">{t('assets.importCsv')}</span>
            </Button>
            <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}>
              <Plus className="w-4 h-4" /><span className="ms-1">{t('assets.addAsset')}</span>
            </Button>
          </div>
        ) : undefined}
      />

      <FilterBar
        searchPlaceholder={t('assets.searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder={t('col.status')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('assets.allStatuses')}</SelectItem>
              <SelectItem value="Active">{t('val.active')}</SelectItem>
              <SelectItem value="Retired">{t('assets.retired')}</SelectItem>
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
          emptyMessage={t('assets.noAssets')}
          onRowClick={(a) => router.push(`/${orgSlug}/assets/${a.id}`)}
          keyExtractor={(a) => a.id}
        />
      </div>

      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && setActionTarget(null)}
        title={actionTarget?.status === 'Retired' ? t('assets.deleteConfirmTitle') : t('assets.retireConfirmTitle')}
        description={actionTarget?.status === 'Retired'
          ? `${t('assets.deleteConfirmDesc').replace('this asset', `"${actionTarget?.name}"`)}`
          : `${t('assets.retireConfirmDesc').replace('this asset', `"${actionTarget?.name}"`)}`}
        confirmLabel={actionTarget?.status === 'Retired' ? t('assets.deleteBtn') : t('assets.retireBtn')}
        onConfirm={handleAction}
        loading={actioning}
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(o) => { setDrawerOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? t('common.edit') : t('assets.addAsset')}
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
