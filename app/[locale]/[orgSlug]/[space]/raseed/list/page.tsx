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
import { Button } from '@/components/ui/button';
import { useOrgInfo } from '@/hooks/org';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog, SubscriptionGate, BulkActionsBar } from '@/components/shared';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/ui';
import { InventoryItem } from '@/types';
import { RequestInventoryModal } from '@/components/inventory/RequestInventoryModal';
import { useT } from '@/hooks/ui';
import { Plus, Pencil, Trash2, AlertTriangle, FileText, X, ArrowRight, Copy, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MoveResourceDialog } from '@/components/spaces/MoveResourceDialog';
import { DuplicateResourceDialog } from '@/components/spaces/DuplicateResourceDialog';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils/cn';

/* ── Inventory summary hook ──────────────────────────────────────── */
function useInventorySummary(space: string | null) {
  return useQuery({
    queryKey: ['inventory-summary', space],
    enabled: !!space,
    staleTime: 30_000,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const [totalRes, lowRes, outRes] = await Promise.all([
        fetch('/api/inventory?pageSize=1', { headers }),
        fetch('/api/inventory?stockStatus=low&pageSize=1', { headers }),
        fetch('/api/inventory?stockStatus=out&pageSize=1', { headers }),
      ]);
      const total   = totalRes.ok   ? ((await totalRes.json())?.total   ?? 0) as number : 0;
      const lowCnt  = lowRes.ok     ? ((await lowRes.json())?.total     ?? 0) as number : 0;
      const outCnt  = outRes.ok     ? ((await outRes.json())?.total     ?? 0) as number : 0;
      return { total, low: lowCnt, out: outCnt };
    },
  });
}

/* ── Inventory KPI card ──────────────────────────────────────────── */
function InvKpi({ label, value, delta, accent, deltaRed, onClick }: {
  label: string; value: React.ReactNode; delta?: React.ReactNode;
  accent: string; deltaRed?: boolean; onClick?: () => void;
}) {
  return (
    <div
      className={`bg-surface-card border border-border rounded-xl overflow-hidden transition-shadow duration-150 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <div className="h-0.5 w-full" style={{ background: accent }} />
      <div className="p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
          {delta != null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${deltaRed ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
              {delta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

function StockBadge({ status, labels }: { status: InventoryItem['stockStatus']; labels: { inStock: string; lowStock: string; outOfStock: string } }) {
  const map = {
    ok:  'bg-[var(--green-100)] text-[var(--green-700)] border-[var(--green-100)]',
    low: 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border-[var(--yellow-100)]',
    out: 'bg-[var(--red-100)] text-[var(--red-700)] border-[var(--red-100)]',
  };
  const label = { ok: labels.inStock, low: labels.lowStock, out: labels.outOfStock };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium', map[status])}>
      {status === 'low' && <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />}
      {label[status]}
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
  const { data: orgInfo } = useOrgInfo();

  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const stockFilter = searchParams.get('stockStatus') ?? '';
  const expiringWithinParam = searchParams.get('expiringWithin') ? parseInt(searchParams.get('expiringWithin')!, 10) : undefined;
  const expiredParam = searchParams.get('expired') === 'true' ? true : undefined;
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : searchParams.get('sortDir') === 'none' ? 'none' : 'desc') as 'asc' | 'desc' | 'none';

  const [searchInput, setSearchInput] = useState(search);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reqTarget, setReqTarget] = useState<InventoryItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [dupeOpen, setDupeOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { data: spaceList } = useAccessibleSpaces();
  const hasMultipleSpaces = (spaceList?.items?.length ?? 0) > 1;

  const { data: summary } = useInventorySummary(space);

  const { data: inventoryData, isLoading } = useInventoryItems({
    category: category || undefined,
    stockStatus: stockFilter || undefined,
    search: search || undefined,
    expiringWithin: expiringWithinParam,
    expired: expiredParam,
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
  const canBulkDelete = !!user && hasPermission(user, 'inventory', 'bulk_delete');
  const canBulkMove = !!user && hasPermission(user, 'inventory', 'bulk_move');
  const canBulkDuplicate = !!user && hasPermission(user, 'inventory', 'bulk_duplicate');
  const showSelection = canBulkDelete || canBulkMove || canBulkDuplicate;

  const stockLabels = { inStock: t('inventory.inStock'), lowStock: t('inventory.lowStock'), outOfStock: t('inventory.outOfStock') };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      key: 'name', header: t('inventory.item'), sortable: true,
      render: (i) => (
        <div>
          <button
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline text-start cursor-pointer transition-colors duration-150"
            onClick={() => router.push(`/${locale}/${orgSlug}/${space}/raseed/${i.id}`)}
          >
            {i.name}
          </button>
        </div>
      ),
    },
    {
      key: 'sku', header: t('inventory.sku'), sortable: true,
      render: (i) => i.sku
        ? <span className="font-mono text-xs text-gray-500">{i.sku}</span>
        : <span className="text-gray-300">—</span>,
    },
    { key: 'category', header: t('col.category'), sortable: true, render: (i) => <span className="text-sm text-gray-600">{i.category}</span> },
    {
      key: 'stockStatus', header: t('inventory.stock'), sortable: true,
      render: (i) => <StockBadge status={i.stockStatus} labels={stockLabels} />,
    },
    {
      key: 'quantityOnHand', header: t('inventory.onHand'), sortable: true,
      render: (i) => (
        <span className={`text-sm font-semibold tabular-nums ${
          i.stockStatus === 'out' ? 'text-red-600 dark:text-red-400'
          : i.stockStatus === 'low' ? 'text-amber-600 dark:text-amber-400'
          : 'text-green-700 dark:text-green-400'
        }`}>
          {i.quantityOnHand} {i.unit}
        </span>
      ),
    },

    { key: 'location', header: t('col.location'), sortable: true, render: (i) => i.location ? <span className="text-sm text-gray-600">{i.location}</span> : <span className="text-gray-400">—</span> },
    { key: 'supplier', header: t('inventory.supplier'), sortable: true, render: (i) => i.supplier ? <span className="text-sm text-gray-600">{i.supplier}</span> : <span className="text-gray-400">—</span> },
    {
      key: 'actions', header: '',
      render: (i) => (
        <div className="flex items-center gap-1">
          {isAdmin && (
            <>
              <SubscriptionGate>
                <Button size="sm" variant="ghost" aria-label={t('common.edit')}
                  className="transition-colors duration-150"
                  onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/${orgSlug}/${space}/raseed/${i.id}/edit`); }}>
                  <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </SubscriptionGate>
              <SubscriptionGate>
                <Button size="sm" variant="ghost" aria-label={t('common.delete')}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(i); }}>
                  <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </SubscriptionGate>
            </>
          )}
          <Button size="sm" variant="ghost" aria-label={t('inventory.request')}
            className="text-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-colors duration-150"
            onClick={(e) => { e.stopPropagation(); setReqTarget(i); }}>
            <FileText aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      ),
    },
  ];

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/inventory/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
      })),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    const ok = ids.length - failed;
    if (ok > 0) toast.success(t('bulk.deleteSuccess').replace('{count}', String(ok)));
    if (failed > 0) toast.error(t('bulk.deletePartial').replace('{count}', String(failed)));
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['inventory-categories'] });
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
  }

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
  const today = new Date();
  const expiredCount = items.filter((i) => i.expiryDate != null && i.expiryDate < today).length;
  const expiringSoonCount = items.filter((i) => {
    if (!i.expiryDate) return false;
    const d = i.expiryDate instanceof Date ? i.expiryDate : new Date(i.expiryDate);
    const days = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  }).length;

  const stockValue = items.reduce((sum, i) => sum + (i.quantityOnHand * (i.unitCost ?? 0)), 0);
  const stockValueDisplay = stockValue >= 1000
    ? `JOD ${(stockValue / 1000).toFixed(1)}k`
    : `JOD ${stockValue.toFixed(0)}`;

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
        title={t('nav.inventory')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.inventory'), href: `/${locale}/${orgSlug}/${space}/raseed/list` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <SubscriptionGate>
                <Button size="sm" onClick={() => router.push(`/${locale}/${orgSlug}/${space}/raseed/new`)}>
                  <Plus aria-hidden className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('inventory.addItem')}</span>
                </Button>
              </SubscriptionGate>
            )}
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <InvKpi
          label={t('inventory.totalSkus')}
          value={summary?.total ?? <span className="w-12 h-6 bg-surface-sidebar rounded animate-pulse inline-block" />}
          accent="var(--mod-raseed)"
          onClick={() => syncAllToUrl({ stockStatus: '', page: '1' })}
        />
        <InvKpi
          label={t('inventory.belowThreshold')}
          value={(summary?.low ?? 0) + (summary?.out ?? 0)}
          delta={summary && (summary.low + summary.out) > 0 ? `${summary.out} ${t('inventory.outOfStock')}` : undefined}
          deltaRed
          accent="var(--amber-500)"
          onClick={() => syncAllToUrl({ stockStatus: 'low,out', page: '1' })}
        />
        <InvKpi
          label={t('inventory.stockValue')}
          value={isLoading ? <span className="w-16 h-6 bg-surface-sidebar rounded animate-pulse inline-block" /> : stockValueDisplay}
          accent="var(--mod-maal, #1B5E20)"
        />
      </div>

      {/* Stats line */}
      {summary && (
        <div className="flex items-center gap-3 mb-4 text-sm text-gray-500 flex-wrap">
          <span className="tabular-nums">
            <span className="font-semibold text-gray-700">{summary.total.toLocaleString()}</span> {t('inventory.items')}
          </span>
          <span className="text-gray-300">·</span>
          <span className="tabular-nums">
            <span className={`font-semibold ${summary.low > 0 ? 'text-amber-600' : 'text-gray-700'}`}>{summary.low}</span> {t('inventory.lowStock')}
          </span>
          <span className="text-gray-300">·</span>
          <span className="tabular-nums">
            <span className={`font-semibold ${summary.out > 0 ? 'text-red-600' : 'text-gray-700'}`}>{summary.out}</span> {t('inventory.outOfStock')}
          </span>
        </div>
      )}

      {(lowCount > 0 || outCount > 0 || expiredCount > 0 || expiringSoonCount > 0) && (
        <div className="mb-4 flex gap-3 flex-wrap items-center">
          {expiredCount > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/${locale}/${orgSlug}/${space}/raseed/list?expired=true`)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer',
                'bg-red-50 border-red-200 text-red-700 dark:text-red-700',
                'hover:bg-red-100 hover:border-red-300',
                expiredParam && 'ring-2 ring-red-400 bg-red-100',
              )}
            >
              <AlertTriangle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              <span>{expiredCount > 1 ? t('inventory.expiredItemsPlural').replace('{count}', String(expiredCount)) : t('inventory.expiredItems').replace('{count}', String(expiredCount))}</span>
              {expiredParam && <X className="h-3.5 w-3.5 ms-1 opacity-70" strokeWidth={2} aria-hidden />}
            </button>
          )}
          {expiringSoonCount > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/${locale}/${orgSlug}/${space}/raseed/list?expiringWithin=30`)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer',
                'bg-amber-50 border-amber-200 text-amber-700 dark:text-amber-700',
                'hover:bg-amber-100 hover:border-amber-300',
                expiringWithinParam != null && 'ring-2 ring-amber-400 bg-amber-100',
              )}
            >
              <Clock aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              <span>{expiringSoonCount > 1 ? t('inventory.expiringSoonItemsPlural').replace('{count}', String(expiringSoonCount)) : t('inventory.expiringSoonItems').replace('{count}', String(expiringSoonCount))}</span>
              {expiringWithinParam != null && <X className="h-3.5 w-3.5 ms-1 opacity-70" strokeWidth={2} aria-hidden />}
            </button>
          )}
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
              <AlertTriangle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
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
              <AlertTriangle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
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

      <BulkActionsBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
        {hasMultipleSpaces && canBulkDuplicate && (
          <Button size="sm" variant="ghost" className="!text-white hover:bg-white/10" onClick={() => setDupeOpen(true)}>
            <Copy aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="ms-1">{t('duplicate.bulk')}</span>
          </Button>
        )}
        {hasMultipleSpaces && canBulkMove && (
          <Button size="sm" variant="ghost" className="!text-white hover:bg-white/10" onClick={() => setMoveOpen(true)}>
            <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="ms-1">{t('move.bulkMove')}</span>
          </Button>
        )}
        {canBulkDelete && (
          <Button size="sm" variant="ghost" className="!text-red-300 hover:bg-red-500/15 hover:!text-red-200" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="ms-1">{t('bulk.delete')}</span>
          </Button>
        )}
      </BulkActionsBar>

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={items}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('inventory.noItems')}
          onRowClick={(i) => router.push(`/${locale}/${orgSlug}/${space}/raseed/${i.id}`)}
          rowClassName={(i) => i.stockStatus === 'out' ? 'bg-red-50/40 dark:bg-red-950/10' : ''}
          keyExtractor={(i) => i.id}
          selection={showSelection ? { selectedIds, onChange: setSelectedIds } : undefined}
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
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t('bulk.deleteTitle')}
        description={t('bulk.deleteDesc').replace('{count}', String(selectedIds.size))}
        confirmLabel={t('bulk.delete')}
        variant="destructive"
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('inventory.deleteItem')}
        description={t('inventory.deleteItemDesc').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        loading={deleting}
      />

      <RequestInventoryModal
        open={!!reqTarget}
        onOpenChange={(o) => !o && setReqTarget(null)}
        itemId={reqTarget?.id ?? ''}
        itemName={reqTarget?.name ?? ''}
      />

      <MoveResourceDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        type="inventory"
        ids={[...selectedIds]}
        recordLabel={t('bulk.selected').replace('{count}', String(selectedIds.size))}
        onMoved={() => setSelectedIds(new Set())}
      />

      <DuplicateResourceDialog
        open={dupeOpen}
        onOpenChange={setDupeOpen}
        type="inventory"
        ids={[...selectedIds]}
        recordLabel={t('bulk.selected').replace('{count}', String(selectedIds.size))}
        onDuplicated={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
