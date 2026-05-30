'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useOrgSlug, useSpace } from '@/hooks/ui';
import { useInventoryItems, useInventoryCategories } from '@/hooks/inventory';
import { useList } from '@/hooks/lists';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { InventoryItemForm } from '@/components/inventory/InventoryItemForm';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog, SubscriptionGate } from '@/components/shared';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/ui';
import { InventoryItem } from '@/types';
import { RequestInventoryModal } from '@/components/inventory/RequestInventoryModal';
import { useT } from '@/hooks/ui';
import { Plus, Pencil, Trash2, AlertTriangle, FileText, X, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

function StockBadge({ status, qty, unit, labels }: { status: InventoryItem['stockStatus']; qty: number; unit: string; labels: { inStock: string; lowStock: string; outOfStock: string } }) {
  const map = {
    ok:  'bg-[var(--green-100)] text-[var(--green-700)] border-[var(--green-100)]',
    low: 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border-[var(--yellow-100)]',
    out: 'bg-[var(--red-100)] text-[var(--red-700)] border-[var(--red-100)]',
  };
  const label = { ok: labels.inStock, low: labels.lowStock, out: labels.outOfStock };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium', map[status])}>
      {status === 'low' && <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />}
      {qty} {unit} · {label[status]}
    </span>
  );
}

export default function InventoryListPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const stockFilter = searchParams.get('stockStatus') ?? '';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : searchParams.get('sortDir') === 'none' ? 'none' : 'desc') as 'asc' | 'desc' | 'none';

  const [searchInput, setSearchInput] = useState(search);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [reqTarget, setReqTarget] = useState<InventoryItem | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [showDiscardDrawer, setShowDiscardDrawer] = useState(false);

  function closeDrawer() { setDrawerOpen(false); setEditTarget(null); setFormDirty(false); }
  function handleDrawerCloseRequest() {
    if (formDirty) { setShowDiscardDrawer(true); } else { closeDrawer(); }
  }

  const { data: inventoryData, isLoading } = useInventoryItems({
    category: category || undefined,
    stockStatus: stockFilter || undefined,
    search: search || undefined,
    page,
    pageSize,
    sortBy: sortDir === 'none' ? undefined : sortBy,
    sortDir: sortDir === 'none' ? undefined : sortDir,
  });
  const { data: usedCategories } = useInventoryCategories();
  const { data: listCategories = [] } = useList('inventory_category');
  const categories = Array.from(
    new Set([
      ...listCategories.map((c) => c.label),
      ...(usedCategories ?? []),
    ])
  ).sort((a, b) => a.localeCompare(b));
  const items = inventoryData?.items ?? [];

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  const debouncedSearchInput = useDebounce(searchInput, 400);
  useEffect(() => {
    if (debouncedSearchInput !== search) {
      updateUrl({
        search: debouncedSearchInput,
        category,
        stockStatus: stockFilter,
        page: '1',
        pageSize: String(pageSize),
        sortBy,
        sortDir,
      });
    }
  }, [debouncedSearchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const stockLabels = { inStock: t('inventory.inStock'), lowStock: t('inventory.lowStock'), outOfStock: t('inventory.outOfStock') };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      key: 'name', header: t('inventory.item'), sortable: true,
      render: (i) => (
        <div>
          <button className="font-medium text-primary-600 hover:underline text-start" onClick={() => router.push(`/${locale}/${orgSlug}/${space}/raseed/${i.id}`)}>
            {i.name}
          </button>
          {i.sku && <div className="text-xs text-gray-400 font-mono">{i.sku}</div>}
        </div>
      ),
    },
    { key: 'category', header: t('col.category'), sortable: true, render: (i) => i.category },
    { key: 'stockStatus', header: t('inventory.stock'), sortable: true, render: (i) => <StockBadge status={i.stockStatus} qty={i.quantityOnHand} unit={i.unit} labels={stockLabels} /> },
    { key: 'quantityOnHand', header: t('inventory.minThreshold'), sortable: true, render: (i) => <span className="text-sm text-gray-600">{i.minimumThreshold} {i.unit}</span> },
    { key: 'location', header: t('col.location'), sortable: true, render: (i) => i.location || <span className="text-gray-400">—</span> },
    { key: 'supplier', header: t('inventory.supplier'), sortable: true, render: (i) => i.supplier || <span className="text-gray-400">—</span> },
    {
      key: 'actions', header: '',
      render: (i) => (
        <div className="flex items-center gap-1">
          {isAdmin && (
            <>
              <SubscriptionGate>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditTarget(i); setDrawerOpen(true); }}>
                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </SubscriptionGate>
              <SubscriptionGate>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteTarget(i); }}>
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </SubscriptionGate>
            </>
          )}
          <Button size="sm" variant="ghost" className="text-primary-500 hover:text-primary-600 hover:bg-primary-50" onClick={(e) => { e.stopPropagation(); setReqTarget(i); }}>
            <FileText className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      ),
    },
  ];

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        const key =
          body.code === 'INVENTORY_DELETE_OPEN_REQUESTS'
            ? 'inventory.deleteBlockedOpenRequests'
            : body.code === 'INVENTORY_DELETE_ACTIVE_WARRANTY'
              ? 'inventory.deleteBlockedActiveWarranty'
              : null;
        toast.error(key ? t(key) : (body.error || t('inventory.itemDeleteFailed')));
        setDeleteTarget(null);
        return;
      }
      toast.success(t('inventory.itemDeleted'));
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      setDeleteTarget(null);
    } catch {
      toast.error(t('inventory.itemDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  const lowCount = items.filter((i) => i.stockStatus === 'low').length;
  const outCount = items.filter((i) => i.stockStatus === 'out').length;

  // stockFilter is comma-separated, e.g. "low" or "low,out". A Set makes
  // toggling each banner independent (clicking one doesn't clear the other).
  const stockFilterSet = new Set(stockFilter.split(',').map((s) => s.trim()).filter(Boolean));
  const stockMultiActive = stockFilterSet.size > 1;

  function toggleStockValue(value: 'low' | 'out' | 'ok') {
    const next = new Set(stockFilterSet);
    if (next.has(value)) next.delete(value); else next.add(value);
    syncAllToUrl({ stockStatus: Array.from(next).join(','), page: '1' });
  }

  function syncAllToUrl(next: Partial<Record<'search' | 'category' | 'stockStatus' | 'page' | 'pageSize' | 'sortBy' | 'sortDir', string>>) {
    updateUrl({
      search: next.search ?? search,
      category: next.category ?? category,
      stockStatus: next.stockStatus ?? stockFilter,
      page: next.page ?? String(page),
      pageSize: next.pageSize ?? String(pageSize),
      sortBy: next.sortBy ?? sortBy,
      sortDir: next.sortDir ?? sortDir,
    });
  }

  function handleCategoryChange(v: string) {
    const next = v === 'all' ? '' : v;
    syncAllToUrl({ category: next, page: '1' });
  }

  function handleStockChange(v: string) {
    const next = v === 'all' ? '' : v;
    syncAllToUrl({ stockStatus: next, page: '1' });
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
        title={t('nav.inventoryList')}
        breadcrumb={[
          { label: t('nav.inventory'), href: `/${locale}/${orgSlug}/${space}/raseed` },
          { label: t('nav.inventoryList'), href: `/${locale}/${orgSlug}/${space}/raseed/list` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push(`/${locale}/${orgSlug}/${space}/raseed/audits`)}>
              <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />
              <span className="ms-1">{t('stockAudits.title')}</span>
            </Button>
            {isAdmin && (
              <SubscriptionGate>
                <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}>
                  <Plus className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('inventory.addItem')}</span>
                </Button>
              </SubscriptionGate>
            )}
          </div>
        }
      />

      {(lowCount > 0 || outCount > 0) && (
        <div className="mb-4 flex gap-3 flex-wrap items-center">
          {outCount > 0 && (
            <button
              type="button"
              onClick={() => toggleStockValue('out')}
              aria-pressed={stockFilterSet.has('out')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer',
                'bg-red-50 border-red-200 text-red-700 dark:text-red-700',
                'hover:bg-red-100 hover:border-red-300',
                'focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1',
                stockFilterSet.has('out') && 'ring-2 ring-red-400 bg-red-100',
              )}
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
              <span>{outCount > 1 ? t('inventory.itemsOutOfStockPlural').replace('{count}', String(outCount)) : t('inventory.itemsOutOfStock').replace('{count}', String(outCount))}</span>
              {stockFilterSet.has('out') && <X className="h-3.5 w-3.5 ms-1 opacity-70" strokeWidth={2} aria-hidden />}
            </button>
          )}
          {lowCount > 0 && (
            <button
              type="button"
              onClick={() => toggleStockValue('low')}
              aria-pressed={stockFilterSet.has('low')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer',
                'bg-amber-50 border-amber-200 text-amber-700 dark:text-amber-700',
                'hover:bg-amber-100 hover:border-amber-300',
                'focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-1',
                stockFilterSet.has('low') && 'ring-2 ring-amber-400 bg-amber-100',
              )}
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
              <span>{lowCount > 1 ? t('inventory.itemsRunningLowPlural').replace('{count}', String(lowCount)) : t('inventory.itemsRunningLow').replace('{count}', String(lowCount))}</span>
              {stockFilterSet.has('low') && <X className="h-3.5 w-3.5 ms-1 opacity-70" strokeWidth={2} aria-hidden />}
            </button>
          )}
        </div>
      )}

      <FilterBar
        searchPlaceholder={t('inventory.searchPlaceholder')}
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        filters={
          <div className="flex items-center gap-2">
            <Select value={category || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t('inventory.allCategories')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.allCategories')}</SelectItem>
                {(categories ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={stockMultiActive ? stockFilter : (stockFilter || 'all')}
              onValueChange={handleStockChange}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={stockMultiActive ? t('inventory.multipleStock') : t('inventory.allStock')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.allStock')}</SelectItem>
                <SelectItem value="ok">{t('inventory.inStock')}</SelectItem>
                <SelectItem value="low">{t('inventory.lowStock')}</SelectItem>
                <SelectItem value="out">{t('inventory.outOfStock')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={items}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('inventory.noItems')}
          onRowClick={(i) => router.push(`/${locale}/${orgSlug}/${space}/raseed/${i.id}`)}
          keyExtractor={(i) => i.id}
          pagination={inventoryData ? {
            page: inventoryData.page,
            pageSize: inventoryData.pageSize,
            total: inventoryData.total,
            totalPages: inventoryData.totalPages,
            onPageChange: (p) => syncAllToUrl({ page: String(p) }),
            onPageSizeChange: (s) => syncAllToUrl({ pageSize: String(s), page: '1' }),
            onSortChange: handleSortChange,
            currentSortBy: sortBy,
            currentSortDir: sortDir,
          } : undefined}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('inventory.deleteItem')}
        description={t('inventory.deleteItemDesc').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        loading={deleting}
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCloseAttempt={handleDrawerCloseRequest}
        title={editTarget ? t('inventory.editItem') : t('inventory.addInventoryItem')}
        width="xl"
      >
        <InventoryItemForm
          item={editTarget ?? undefined}
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

      <RequestInventoryModal
        open={!!reqTarget}
        onOpenChange={(o) => !o && setReqTarget(null)}
        itemId={reqTarget?.id ?? ''}
        itemName={reqTarget?.name ?? ''}
      />
    </div>
  );
}
