'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useOrgSlug } from '@/hooks/ui';
import { useWarranties } from '@/hooks/warranties';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExportButton } from '@/components/shared/ExportButton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warranty } from '@/types';
import { formatDate, isExpired, getWarrantyStatus } from '@/lib/utils/date';
import { useT } from '@/hooks/ui';
function PlusSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function EditSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /></svg>; }
function Trash2SVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function CheckSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
import { FormDrawer } from '@/components/shared/FormDrawer';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { ConfirmDialog, SubscriptionGate } from '@/components/shared';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

export default function WarrantiesPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1);
  const [pageSize, setPageSize] = useState(searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc');

  const [deleteTarget, setDeleteTarget] = useState<Warranty | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Warranty | null>(null);

  const { data: warrantiesData, isLoading } = useWarranties({
    status: status || undefined,
    page,
    pageSize,
    sortBy,
    sortDir,
  });
  const warranties = warrantiesData?.items ?? [];

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    const urlStatus = searchParams.get('status') ?? '';
    const urlPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const urlPageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
    const urlSortBy = searchParams.get('sortBy') ?? 'createdAt';
    const urlSortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    if (urlStatus !== status) setStatus(urlStatus);
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);
    if (urlSortBy !== sortBy) setSortBy(urlSortBy);
    if (urlSortDir !== sortDir) setSortDir(urlSortDir);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const columns: ColumnDef<Warranty>[] = [
    { key: 'assetId', header: t('col.asset'), sortable: true, render: (w) => <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/${orgSlug}/assets/${w.assetId}`)}>{w.assetName ?? w.assetId}</button> },
    { key: 'vendor', header: t('col.vendor'), sortable: true, render: (w) => w.vendor },
    { key: 'startDate', header: t('warranties.startDate'), sortable: true, render: (w) => formatDate(w.startDate) },
    { key: 'endDate', header: t('warranties.endDate'), sortable: true, render: (w) => <span className={isExpired(w.endDate) ? 'text-red-600' : ''}>{formatDate(w.endDate)}</span> },
    { key: 'reminder', header: t('warranties.reminder'), render: (w) => w.reminder ? <span className="text-green-600"><CheckSVG /></span> : <span className="text-gray-400">—</span> },
    { key: 'status', header: t('col.status'), sortable: true, render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: t('col.actions'),
      render: (w) => (
        <div className="flex gap-1">
          {isAdmin ? (
            <>
              <SubscriptionGate>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditTarget(w); setDrawerOpen(true); }}><EditSVG /></Button>
              </SubscriptionGate>
              <SubscriptionGate>
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteTarget(w); }}><Trash2SVG /></Button>
              </SubscriptionGate>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => router.push(`/${orgSlug}/assets/${w.assetId}`)}>{t('warranties.viewAsset')}</Button>
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
      toast.success(t('warranties.warrantyDeleted'));
      qc.invalidateQueries({ queryKey: ['warranties'] });
      setDeleteTarget(null);
    } catch { toast.error(t('warranties.warrantyDeleteFailed')); }
    finally { setDeleting(false); }
  }

  function syncAllToUrl(next: Partial<Record<'status' | 'page' | 'pageSize' | 'sortBy' | 'sortDir', string>>) {
    updateUrl({
      status: next.status ?? status,
      page: next.page ?? String(page),
      pageSize: next.pageSize ?? String(pageSize),
      sortBy: next.sortBy ?? sortBy,
      sortDir: next.sortDir ?? sortDir,
    });
  }

  function handleStatusChange(v: string) {
    const next = v === 'all' ? '' : v;
    setStatus(next);
    setPage(1);
    syncAllToUrl({ status: next, page: '1' });
  }

  function handleSortChange(sortByField: string, dir: 'asc' | 'desc') {
    setSortBy(sortByField);
    setSortDir(dir);
    syncAllToUrl({ sortBy: sortByField, sortDir: dir });
  }

  return (
    <div>
      <PageHeader
        title={t('nav.warranties')}
        actions={isAdmin ? (
          <SubscriptionGate>
            <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}><PlusSVG /><span className="ml-1">{t('warranties.addWarranty')}</span></Button>
          </SubscriptionGate>
        ) : undefined}
      />
      <FilterBar
        filters={
          <Select value={status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36"><SelectValue placeholder={t('col.status')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('warranties.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('warranties.active')}</SelectItem>
              <SelectItem value="expired">{t('warranties.expired')}</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={isAdmin ? (
          <SubscriptionGate>
            <ExportButton exportUrl="/api/warranties/export" filename={`warranties-${format(new Date(), 'yyyy-MM-dd')}.csv`} />
          </SubscriptionGate>
        ) : undefined}
      />
      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={warranties}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('warranties.noWarranties')}
          keyExtractor={(w) => w.id}
          pagination={warrantiesData ? {
            page: warrantiesData.page,
            pageSize: warrantiesData.pageSize,
            total: warrantiesData.total,
            totalPages: warrantiesData.totalPages,
            onPageChange: (p) => { setPage(p); syncAllToUrl({ page: String(p) }); },
            onPageSizeChange: (s) => { setPageSize(s); setPage(1); syncAllToUrl({ pageSize: String(s), page: '1' }); },
            onSortChange: handleSortChange,
            currentSortBy: sortBy,
            currentSortDir: sortDir,
          } : undefined}
        />
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('warranties.deleteWarranty')}
        description={t('warranties.deleteWarrantyDesc').replace('{vendor}', deleteTarget?.vendor ?? '')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        loading={deleting}
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(o) => { setDrawerOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? t('warranties.editWarranty') : t('warranties.addWarranty')}
      >
        <WarrantyForm
          warranty={editTarget ?? undefined}
          onSuccess={() => setDrawerOpen(false)}
        />
      </FormDrawer>
    </div>
  );
}
