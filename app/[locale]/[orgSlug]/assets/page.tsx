'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
// useEffect retained for debounced-search → URL commit only.
import { Plus, Pencil, ArchiveX, Trash2, Upload } from 'lucide-react';
import { useOrgSlug } from '@/hooks/ui';
import { useAssets } from '@/hooks/assets';
import { useAuthStore } from '@/store/auth.store';
import { useT } from '@/hooks/ui';
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
import { ConfirmDialog, SubscriptionGate } from '@/components/shared';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/ui';
import { useAssetCategories } from '@/hooks/assets';

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

export default function AssetsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useT();

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const category = searchParams.get('category') ?? '';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : searchParams.get('sortDir') === 'none' ? 'none' : 'desc') as 'asc' | 'desc' | 'none';

  const [searchInput, setSearchInput] = useState(search);
  const [actionTarget, setActionTarget] = useState<Asset | null>(null);
  const [actioning, setActioning] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [showDiscardDrawer, setShowDiscardDrawer] = useState(false);

  function closeDrawer() { setDrawerOpen(false); setEditTarget(null); setFormDirty(false); }
  function handleDrawerCloseRequest() {
    if (formDirty) { setShowDiscardDrawer(true); } else { closeDrawer(); }
  }

  const { data: assetsData, isLoading } = useAssets({
    status: status || undefined,
    category: category || undefined,
    search: search || undefined,
    page,
    pageSize,
    sortBy: sortDir === 'none' ? undefined : sortBy,
    sortDir: sortDir === 'none' ? undefined : sortDir,
  });
  const { data: categories = [] } = useAssetCategories();
  const assets = assetsData?.items ?? [];

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  const debouncedSearchInput = useDebounce(searchInput, 400);
  useEffect(() => {
    if (debouncedSearchInput !== search) {
      updateUrl({
        search: debouncedSearchInput,
        status,
        category,
        page: '1',
        pageSize: String(pageSize),
        sortBy,
        sortDir,
      });
    }
  }, [debouncedSearchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const columns: ColumnDef<Asset>[] = [
    { key: 'name', header: t('col.name'), sortable: true, render: (a) => <button className="font-medium text-primary-600 hover:text-primary-700 hover:underline text-left" onClick={() => router.push(`/${orgSlug}/assets/${a.id}`)}>{a.name}</button> },
    { key: 'category', header: t('col.category'), sortable: true, render: (a) => a.category },
    { key: 'status', header: t('col.status'), sortable: true, render: (a) => <StatusBadge status={a.status} /> },
    { key: 'serialNumber', header: t('col.serialNumber'), sortable: true, render: (a) => a.serialNumber ? <span className="font-mono text-xs text-gray-600">{a.serialNumber}</span> : <span className="text-gray-400">—</span> },
    { key: 'assignedTo', header: t('col.assignedTo'), sortable: true, render: (a) => a.assignedTo || <span className="text-gray-400">—</span> },
    { key: 'location', header: t('col.location'), sortable: true, render: (a) => a.location || <span className="text-gray-400">—</span> },
    { key: 'purchaseDate', header: t('col.purchaseDate'), sortable: true, render: (a) => a.purchaseDate ? formatDate(a.purchaseDate) : <span className="text-gray-400">—</span> },
    {
      key: 'actions', header: t('col.actions'),
      render: (a) => (
        <div className="flex items-center gap-1">
          {isAdmin ? (
            <>
              {a.status !== 'Retired' && (
                <SubscriptionGate>
                  <Button size="sm" variant="ghost" aria-label="Edit asset" onClick={(e) => { e.stopPropagation(); setEditTarget(a); setDrawerOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </SubscriptionGate>
              )}
              {a.status === 'Active' && (
                <SubscriptionGate>
                  <Button size="sm" variant="ghost" className="text-amber-500 hover:text-amber-600 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); setActionTarget(a); }}
                    title={t('assets.retire')}>
                    <ArchiveX className="w-3.5 h-3.5" />
                  </Button>
                </SubscriptionGate>
              )}
              {a.status === 'Retired' && (
                <SubscriptionGate>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setActionTarget(a); }}
                    title={t('assets.deleteBtn')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </SubscriptionGate>
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

  function syncAllToUrl(next: Partial<Record<'search' | 'status' | 'category' | 'page' | 'pageSize' | 'sortBy' | 'sortDir', string>>) {
    updateUrl({
      search: next.search ?? search,
      status: next.status ?? status,
      category: next.category ?? category,
      page: next.page ?? String(page),
      pageSize: next.pageSize ?? String(pageSize),
      sortBy: next.sortBy ?? sortBy,
      sortDir: next.sortDir ?? sortDir,
    });
  }

  function handleStatusChange(v: string) {
    const next = v === 'all' ? '' : v;
    syncAllToUrl({ status: next, page: '1' });
  }

  function handleCategoryChange(v: string) {
    const next = v === 'all' ? '' : v;
    syncAllToUrl({ category: next, page: '1' });
  }

  function handleSearchChange(v: string) {
    setSearchInput(v);
  }

  function handleSortChange(sortByField: string, dir: 'asc' | 'desc' | 'none') {
    syncAllToUrl({ sortBy: sortByField, sortDir: dir === 'none' ? '' : dir });
  }

  return (
    <div>
      <PageHeader
        title={t('nav.assets')}
        actions={isAdmin ? (
          <div className="flex items-center gap-2">
            <SubscriptionGate>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4" /><span className="ms-1">{t('assets.importCsv')}</span>
              </Button>
            </SubscriptionGate>
            <SubscriptionGate>
              <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}>
                <Plus className="w-4 h-4" /><span className="ms-1">{t('assets.addAsset')}</span>
              </Button>
            </SubscriptionGate>
          </div>
        ) : undefined}
      />

      <FilterBar
        searchPlaceholder={t('assets.searchPlaceholder')}
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        filters={
          <div className="flex items-center gap-2">
            <Select value={status || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t('col.status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('assets.allStatuses')}</SelectItem>
                <SelectItem value="Active">{t('val.active')}</SelectItem>
                <SelectItem value="Retired">{t('assets.retired')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t('col.category')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('assets.allCategories')}</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
        actions={isAdmin ? (
          <SubscriptionGate>
            <ExportButton exportUrl="/api/assets/export" filename={`assets-${format(new Date(), 'yyyy-MM-dd')}.csv`} />
          </SubscriptionGate>
        ) : undefined}
      />

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={assets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('assets.noAssets')}
          onRowClick={(a) => router.push(`/${orgSlug}/assets/${a.id}`)}
          keyExtractor={(a) => a.id}
          pagination={assetsData ? {
            page: assetsData.page,
            pageSize: assetsData.pageSize,
            total: assetsData.total,
            totalPages: assetsData.totalPages,
            onPageChange: (p) => syncAllToUrl({ page: String(p) }),
            onPageSizeChange: (s) => syncAllToUrl({ pageSize: String(s), page: '1' }),
            onSortChange: handleSortChange,
            currentSortBy: sortBy,
            currentSortDir: sortDir,
          } : undefined}
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
        onOpenChange={setDrawerOpen}
        onCloseAttempt={handleDrawerCloseRequest}
        title={editTarget ? t('common.edit') : t('assets.addAsset')}
      >
        <AssetForm
          asset={editTarget ?? undefined}
          onSuccess={closeDrawer}
          onCancel={handleDrawerCloseRequest}
          onDirtyChange={setFormDirty}
        />
      </FormDrawer>

      <ConfirmDialog
        open={showDiscardDrawer}
        onOpenChange={setShowDiscardDrawer}
        title="Discard changes?"
        description="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => { setShowDiscardDrawer(false); closeDrawer(); }}
        variant="destructive"
      />

      <ImportAssetsDrawer open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
