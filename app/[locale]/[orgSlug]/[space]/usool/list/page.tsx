'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
// useEffect retained for debounced-search → URL commit only.
import { Plus, Pencil, Trash2, Upload, ArrowRight, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MoveResourceDialog } from '@/components/spaces/MoveResourceDialog';
import { DuplicateResourceDialog } from '@/components/spaces/DuplicateResourceDialog';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { useOrgSlug, useSpace } from '@/hooks/ui';
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
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { Asset } from '@/types';
import { hasPermission } from '@/lib/permissions';
import { formatDate } from '@/lib/utils/date';
import { ConfirmDialog, SubscriptionGate, BulkActionsBar } from '@/components/shared';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/ui';
import { useAssetCategories } from '@/hooks/assets';
import { useList } from '@/hooks/lists';

/* ── Helpers ─────────────────────────────────────────────────────── */
function AssigneeCell({ name }: { name?: string | null }) {
  if (!name) return <span className="text-gray-400">—</span>;
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-full text-[10px] font-semibold flex-shrink-0"
        style={{ width: 22, height: 22, background: 'var(--primary-100)', color: 'var(--primary-700)' }}
      >
        {initials}
      </span>
      <span className="text-sm text-gray-700 truncate max-w-[110px]">{name}</span>
    </div>
  );
}

function useAssetSummary(space: string | null) {
  return useQuery({
    queryKey: ['asset-summary', space],
    enabled: !!space,
    staleTime: 30_000,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const [activeRes, retiredRes, expiringRes] = await Promise.all([
        fetch('/api/assets?status=Active&pageSize=1', { headers }),
        fetch('/api/assets?status=Retired&pageSize=1', { headers }),
        fetch('/api/assets?status=Expiring&pageSize=1', { headers }),
      ]);
      const [a, r, e] = await Promise.all([
        activeRes.ok ? activeRes.json() : { total: 0 },
        retiredRes.ok ? retiredRes.json() : { total: 0 },
        expiringRes.ok ? expiringRes.json() : { total: 0 },
      ]);
      return { active: a.total as number, retired: r.total as number, expiring: e.total as number };
    },
  });
}

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

export default function AssetsListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { t, locale } = useT();

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [dupeOpen, setDupeOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { data: spaceList } = useAccessibleSpaces();
  const hasMultipleSpaces = (spaceList?.items?.length ?? 0) > 1;

  function closeDrawer() { setDrawerOpen(false); setEditTarget(null); setFormDirty(false); }
  function handleDrawerCloseRequest() {
    if (formDirty) { setShowDiscardDrawer(true); } else { closeDrawer(); }
  }

  const { data: summary } = useAssetSummary(space);

  const { data: assetsData, isLoading } = useAssets({
    status: status || undefined,
    category: category || undefined,
    search: search || undefined,
    page,
    pageSize,
    sortBy: sortDir === 'none' ? undefined : sortBy,
    sortDir: sortDir === 'none' ? undefined : sortDir,
  });
  const { data: usedCategories = [] } = useAssetCategories();
  const { data: listCategories = [] } = useList('asset_category');
  const categories = Array.from(
    new Set([
      ...listCategories.map((c) => c.label),
      ...usedCategories,
    ])
  ).sort((a, b) => a.localeCompare(b));
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
  const canCreateAsset = !!user && hasPermission(user, 'assets', 'create');
  const canBulkDelete = !!user && hasPermission(user, 'assets', 'bulk_delete');
  const canBulkMove = !!user && hasPermission(user, 'assets', 'bulk_move');
  const canBulkDuplicate = !!user && hasPermission(user, 'assets', 'bulk_duplicate');
  const showSelection = canBulkDelete || canBulkMove || canBulkDuplicate;

  const columns: ColumnDef<Asset>[] = [
    {
      key: 'name', header: t('col.name'), sortable: true,
      render: (a) => (
        <button
          className="font-medium text-primary-600 hover:text-primary-700 hover:underline text-start cursor-pointer transition-colors duration-150"
          onClick={() => router.push(`/${locale}/${orgSlug}/${space}/usool/${a.id}`)}
        >
          {a.name}
        </button>
      ),
    },
    { key: 'category', header: t('col.category'), sortable: true, render: (a) => <span className="text-sm text-gray-600">{a.category}</span> },
    { key: 'status', header: t('col.status'), sortable: true, render: (a) => <StatusBadge status={a.status} marker="dot" /> },
    {
      key: 'serialNumber', header: t('col.serialNumber'), sortable: true,
      render: (a) => a.serialNumber
        ? <span className="font-mono text-xs text-gray-600">{a.serialNumber}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'assignedTo', header: t('col.assignedTo'), sortable: true,
      render: (a) => <AssigneeCell name={a.assignedTo} />,
    },
    { key: 'location', header: t('col.location'), sortable: true, render: (a) => a.location ? <span className="text-sm text-gray-600">{a.location}</span> : <span className="text-gray-400">—</span> },
    {
      key: 'purchaseDate', header: t('col.purchaseDate'), sortable: true,
      render: (a) => a.purchaseDate
        ? <span className="text-sm text-gray-600 tabular-nums font-mono">{formatDate(a.purchaseDate)}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'purchaseCost', header: t('col.cost'), sortable: true,
      render: (a) => a.purchaseCost != null
        ? <span className="text-sm font-medium tabular-nums font-mono">{a.purchaseCost.toLocaleString()}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'actions', header: '',
      render: (a) => (
        <div className="flex items-center gap-1">
          {isAdmin ? (
            <>
              {a.status !== 'Retired' && (
                <SubscriptionGate>
                  <Button size="sm" variant="ghost" aria-label={t('common.edit')}
                    className="transition-colors duration-150"
                    onClick={(e) => { e.stopPropagation(); setEditTarget(a); setDrawerOpen(true); }}>
                    <Pencil aria-hidden className="w-3.5 h-3.5" />
                  </Button>
                </SubscriptionGate>
              )}
              {a.status === 'Retired' && (
                <SubscriptionGate>
                  <Button size="sm" variant="ghost"
                    aria-label={t('assets.deleteBtn')}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                    onClick={(e) => { e.stopPropagation(); setActionTarget(a); }}>
                    <Trash2 aria-hidden className="w-3.5 h-3.5" />
                  </Button>
                </SubscriptionGate>
              )}
            </>
          ) : (
            <Button size="sm" variant="ghost" className="transition-colors duration-150"
              onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/${orgSlug}/${space}/usool/${a.id}`); }}>
              {t('assets.view')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/assets/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
      })),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    const ok = ids.length - failed;
    if (ok > 0) toast.success(t('bulk.deleteSuccess').replace('{count}', String(ok)));
    if (failed > 0) toast.error(t('bulk.deletePartial').replace('{count}', String(failed)));
    qc.invalidateQueries({ queryKey: ['assets'] });
    qc.invalidateQueries({ queryKey: ['asset-categories'] });
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
  }

  async function handleAction() {
    if (!actionTarget) return;
    setActioning(true);
    const isRetired = actionTarget.status === 'Retired';
    try {
      await fetch(`/api/assets/${actionTarget.id}`, { method: 'DELETE' });
      toast.success(isRetired ? t('assets.deleteDone') : t('assets.retireDone'));
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset-categories'] });
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

  const totalAll = (summary?.active ?? 0) + (summary?.retired ?? 0) + (summary?.expiring ?? 0);

  const statusChips = [
    { label: t('assets.filterAll'),      value: '',           count: totalAll },
    { label: t('assets.filterActive'),   value: 'Active',     count: summary?.active },
    { label: t('assets.filterExpiring'), value: 'Expiring',   count: summary?.expiring },
    { label: t('assets.filterRetired'),  value: 'Retired',    count: summary?.retired },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.assetsList')}
        breadcrumb={[
          { label: t('nav.assets'), href: `/${locale}/${orgSlug}/${space}/usool` },
          { label: t('nav.assetsList'), href: `/${locale}/${orgSlug}/${space}/usool/list` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <SubscriptionGate>
                <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload aria-hidden className="w-4 h-4" /><span className="ms-1">{t('assets.importCsv')}</span>
                </Button>
              </SubscriptionGate>
            )}
            {canCreateAsset && (
              <SubscriptionGate>
                <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}>
                  <Plus aria-hidden className="w-4 h-4" /><span className="ms-1">{t('assets.addAsset')}</span>
                </Button>
              </SubscriptionGate>
            )}
          </div>
        }
      />

      {/* Quick filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {statusChips.map((chip) => {
          const active = status === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => syncAllToUrl({ status: chip.value, page: '1' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-150 cursor-pointer ${
                active
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface-card text-gray-600 border-border hover:border-gray-300 hover:bg-surface-sidebar'
              }`}
            >
              {chip.label}
              {chip.count != null && (
                <span className={`tabular-nums px-1.5 py-0.5 rounded-full text-[10px] ${
                  active ? 'bg-white/20 text-white' : 'bg-surface-inset text-gray-500'
                }`}>
                  {chip.count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <FilterBar
        searchPlaceholder={t('assets.searchPlaceholder')}
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        filters={
          <div className="flex items-center gap-2">
            <ConfigSelect listKey="asset_status" value={status || 'all'} onValueChange={handleStatusChange} includeAll allLabel={t('assets.allStatuses')} className="w-44" />
            <Select value={category || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-44"><SelectValue placeholder={t('col.category')} /></SelectTrigger>
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

      <BulkActionsBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
        {hasMultipleSpaces && canBulkDuplicate && (
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setDupeOpen(true)}>
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="ms-1">{t('duplicate.bulk')}</span>
          </Button>
        )}
        {hasMultipleSpaces && canBulkMove && (
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setMoveOpen(true)}>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="ms-1">{t('move.bulkMove')}</span>
          </Button>
        )}
        {canBulkDelete && (
          <Button size="sm" variant="ghost" className="text-red-300 hover:bg-red-500/15 hover:text-red-200" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="ms-1">{t('bulk.delete')}</span>
          </Button>
        )}
      </BulkActionsBar>

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={assets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('assets.noAssets')}
          onRowClick={(a) => router.push(`/${locale}/${orgSlug}/${space}/usool/${a.id}`)}
          keyExtractor={(a) => a.id}
          selection={showSelection ? { selectedIds, onChange: setSelectedIds } : undefined}
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
        title={t('common.discardTitle')}
        description={t('common.discardDesc')}
        confirmLabel={t('common.discard')}
        cancelLabel={t('common.keepEditing')}
        onConfirm={() => { setShowDiscardDrawer(false); closeDrawer(); }}
        variant="destructive"
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t('bulk.deleteTitle')}
        description={t('bulk.deleteDesc').replace('{count}', String(selectedIds.size))}
        confirmLabel={t('bulk.delete')}
        variant="destructive"
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
      />

      <ImportAssetsDrawer open={importOpen} onOpenChange={setImportOpen} />

      <MoveResourceDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        type="asset"
        ids={[...selectedIds]}
        recordLabel={t('bulk.selected').replace('{count}', String(selectedIds.size))}
        onMoved={() => setSelectedIds(new Set())}
      />

      <DuplicateResourceDialog
        open={dupeOpen}
        onOpenChange={setDupeOpen}
        type="asset"
        ids={[...selectedIds]}
        recordLabel={t('bulk.selected').replace('{count}', String(selectedIds.size))}
        onDuplicated={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
