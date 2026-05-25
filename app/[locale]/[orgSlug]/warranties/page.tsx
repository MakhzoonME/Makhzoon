'use client';
import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useOrgSlug } from '@/hooks/ui';
import { useWarranties } from '@/hooks/warranties';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { Warranty } from '@/types';
import { formatDate, isExpired, getWarrantyStatus } from '@/lib/utils/date';
import { useT } from '@/hooks/ui';
import { Check } from 'lucide-react';

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

export default function WarrantiesPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgSlug = useOrgSlug();

  const status = searchParams.get('status') ?? '';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : searchParams.get('sortDir') === 'none' ? 'none' : 'desc') as 'asc' | 'desc' | 'none';

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

  const columns: ColumnDef<Warranty>[] = [
    { key: 'assetId', header: t('col.asset'), sortable: true, render: (w) => <button className="text-primary-600 hover:underline" onClick={() => router.push(`/${locale}/${orgSlug}/usool/${w.assetId}`)}>{w.assetName ?? w.assetId}</button> },
    { key: 'vendor', header: t('col.vendor'), sortable: true, render: (w) => w.vendor },
    { key: 'startDate', header: t('warranties.startDate'), sortable: true, render: (w) => formatDate(w.startDate) },
    { key: 'endDate', header: t('warranties.endDate'), sortable: true, render: (w) => <span className={isExpired(w.endDate) ? 'text-red-600 dark:text-red-400' : ''}>{formatDate(w.endDate)}</span> },
    { key: 'reminder', header: t('warranties.reminder'), render: (w) => w.reminder ? <span className="text-green-600 dark:text-green-400"><Check className="h-4 w-4" strokeWidth={1.75} /></span> : <span className="text-gray-400">—</span> },
    { key: 'status', header: t('col.status'), sortable: true, render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: t('col.actions'),
      render: (w) => (
        <Button size="sm" variant="ghost" onClick={() => router.push(`/${locale}/${orgSlug}/usool/${w.assetId}`)}>{t('warranties.viewAsset')}</Button>
      )
    },
  ];

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
      />
      <FilterBar
        filters={
          <ConfigSelect listKey="warranty_status" value={status || 'all'} onValueChange={handleStatusChange} includeAll allLabel={t('warranties.allStatuses')} className="w-44" />
        }
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
    </div>
  );
}
