'use client';
import { useState, useCallback } from 'react';
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
import { FormDrawer } from '@/components/shared/FormDrawer';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { ConfirmDialog, SubscriptionGate } from '@/components/shared';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';

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

  const status = searchParams.get('status') ?? '';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : searchParams.get('sortDir') === 'none' ? 'none' : 'desc') as 'asc' | 'desc' | 'none';

  const [deleteTarget, setDeleteTarget] = useState<Warranty | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Warranty | null>(null);

  const { data: warrantiesData, isLoading } = useWarranties({
    status: status || undefined,
    page,
    pageSize,
    sortBy: sortDir === 'none' ? undefined : sortBy,
    sortDir: sortDir === 'none' ? undefined : sortDir,
  });
  const warranties = warrantiesData?.items ?? [];

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const columns: ColumnDef<Warranty>[] = [
    { key: 'assetId', header: t('col.asset'), sortable: true, render: (w) => <button className="text-primary-600 hover:underline" onClick={() => router.push(`/${orgSlug}/assets/${w.assetId}`)}>{w.assetName ?? w.assetId}</button> },
    { key: 'vendor', header: t('col.vendor'), sortable: true, render: (w) => w.vendor },
    { key: 'startDate', header: t('warranties.startDate'), sortable: true, render: (w) => formatDate(w.startDate) },
    { key: 'endDate', header: t('warranties.endDate'), sortable: true, render: (w) => <span className={isExpired(w.endDate) ? 'text-red-600' : ''}>{formatDate(w.endDate)}</span> },
    { key: 'reminder', header: t('warranties.reminder'), render: (w) => w.reminder ? <span className="text-green-600"><Check className="h-4 w-4" strokeWidth={1.75} /></span> : <span className="text-gray-400">—</span> },
    { key: 'status', header: t('col.status'), sortable: true, render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: t('col.actions'),
      render: (w) => (
        <div className="flex gap-1">
          {isAdmin ? (
            <>
              <SubscriptionGate>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditTarget(w); setDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" strokeWidth={1.75} /></Button>
              </SubscriptionGate>
              <SubscriptionGate>
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteTarget(w); }}><Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} /></Button>
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
    syncAllToUrl({ status: next, page: '1' });
  }

  function handleSortChange(sortByField: string, dir: 'asc' | 'desc' | 'none') {
    syncAllToUrl({ sortBy: sortByField, sortDir: dir === 'none' ? '' : dir });
  }

  return (
    <div>
      <PageHeader
        title={t('nav.warranties')}
        actions={isAdmin ? (
          <SubscriptionGate>
            <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}><Plus className="h-4 w-4" strokeWidth={1.75} /><span className="ml-1">{t('warranties.addWarranty')}</span></Button>
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
      <div className="bg-surface-card rounded-lg border border-border">
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
