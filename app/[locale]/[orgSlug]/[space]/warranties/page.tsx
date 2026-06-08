'use client';
import { useCallback, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useOrgSlug, useSpace, useModuleGuard } from '@/hooks/ui';
import { useWarranties } from '@/hooks/warranties';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { Warranty } from '@/types';
import { formatDate, daysUntil, getWarrantyStatus } from '@/lib/utils/date';
import { useT } from '@/hooks/ui';
import { Check, Plus, Shield } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useOrgInfo } from '@/hooks/org';

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

function DaysLeftBadge({ endDate }: { endDate: string | Date }) {
  const days = daysUntil(endDate);
  const tone = days < 0 ? 'bg-[var(--red-100)] text-[var(--red-700)] border-[var(--red-100)]'
    : days <= 7  ? 'bg-[var(--red-100)] text-[var(--red-700)] border-[var(--red-100)]'
    : days <= 14 ? 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border-[var(--yellow-100)]'
    : days <= 30 ? 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border-[var(--yellow-100)]'
    : 'bg-[var(--green-100)] text-[var(--green-700)] border-[var(--green-100)]';
  const label = days < 0 ? `${Math.abs(days)}d ago` : `${days}d`;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold tabular-nums', tone)}>
      {label}
    </span>
  );
}

export default function WarrantiesPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'warranties', moduleKey: 'warranties' });
  const { t, locale } = useT();
  if (!isAllowed) return null;
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const orgSlug      = useOrgSlug();
  const space        = useSpace();
  const { data: orgInfo } = useOrgInfo();
  const [searchInput, setSearchInput] = useState('');

  const status  = searchParams.get('status') ?? '';
  const page    = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
  const sortBy  = searchParams.get('sortBy') ?? 'endDate';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : searchParams.get('sortDir') === 'none' ? 'none' : 'asc') as 'asc' | 'desc' | 'none';

  const { data: warrantiesData, isLoading } = useWarranties({
    status: status || undefined,
    page,
    pageSize,
    sortBy: sortDir === 'none' ? undefined : sortBy,
    sortDir: sortDir === 'none' ? undefined : sortDir,
  });

  // Count expiring ≤30 days from current page data
  const warranties   = warrantiesData?.items ?? [];
  const expiringCount = warranties.filter((w) => { const d = daysUntil(w.endDate); return d >= 0 && d <= 30; }).length;

  const updateUrl = useCallback((params: Record<string, string>) => {
    router.replace(syncFiltersToUrl(pathname, params), { scroll: false });
  }, [pathname, router]);

  function syncAllToUrl(next: Partial<Record<'status' | 'page' | 'pageSize' | 'sortBy' | 'sortDir', string>>) {
    updateUrl({
      status:   next.status   ?? status,
      page:     next.page     ?? String(page),
      pageSize: next.pageSize ?? String(pageSize),
      sortBy:   next.sortBy   ?? sortBy,
      sortDir:  next.sortDir  ?? sortDir,
    });
  }

  const filtered = searchInput.trim()
    ? warranties.filter((w) =>
        (w.assetName ?? w.assetId ?? '').toLowerCase().includes(searchInput.toLowerCase()) ||
        w.vendor.toLowerCase().includes(searchInput.toLowerCase())
      )
    : warranties;

  const columns: ColumnDef<Warranty>[] = [
    {
      key: 'assetId', header: t('col.asset'), sortable: true,
      render: (w) => (
        <button
          className="font-medium text-primary-600 hover:text-primary-700 hover:underline text-start cursor-pointer transition-colors duration-150"
          onClick={() => router.push(`/${locale}/${orgSlug}/${space}/usool/${w.assetId}`)}
        >
          {w.assetName ?? w.assetId}
        </button>
      ),
    },
    { key: 'vendor', header: t('col.vendor'), sortable: true, render: (w) => <span className="text-sm text-gray-700">{w.vendor}</span> },
    {
      key: 'startDate', header: t('col.start'), sortable: true,
      render: (w) => <span className="text-sm text-gray-500 tabular-nums font-mono">{formatDate(w.startDate)}</span>,
    },
    {
      key: 'endDate', header: t('col.end'), sortable: true,
      render: (w) => <span className="text-sm text-gray-700 tabular-nums font-mono">{formatDate(w.endDate)}</span>,
    },
    {
      key: 'daysLeft', header: t('warranties.daysLeft'),
      render: (w) => <DaysLeftBadge endDate={w.endDate} />,
    },
    {
      key: 'reminder', header: t('warranties.reminder'),
      render: (w) => w.reminder
        ? <span className="text-green-600 dark:text-green-400"><Check aria-hidden className="h-4 w-4" strokeWidth={1.75} /></span>
        : <span className="text-gray-400">—</span>,
    },
    { key: 'status', header: t('col.status'), sortable: true, render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: '',
      render: (w) => (
        <Button size="sm" variant="ghost"
          className="cursor-pointer transition-colors duration-150"
          onClick={() => router.push(`/${locale}/${orgSlug}/${space}/usool/${w.assetId}`)}>
          {t('warranties.viewAsset')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.warranties')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.warranties') },
        ]}
        actions={
          <Button size="sm"
            className="cursor-pointer transition-colors duration-150"
            onClick={() => router.push(`/${locale}/${orgSlug}/${space}/warranties/new`)}>
            <Plus aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            <span className="ms-1">{t('warranties.addWarranty')}</span>
          </Button>
        }
      />

      {/* Stats line */}
      {!isLoading && warrantiesData && (
        <div className="flex items-center gap-3 mb-4 text-sm text-gray-500 flex-wrap">
          <span>
            <span className="font-semibold text-gray-700 tabular-nums">{warrantiesData.total.toLocaleString()}</span>
            {' '}{t('warranties.tracked')}
          </span>
          {expiringCount > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span>
                <span className="font-semibold text-amber-600 tabular-nums">{expiringCount}</span>
                {' '}{t('warranties.expiringSoon30')}
              </span>
            </>
          )}
        </div>
      )}

      {/* Warning banner */}
      {expiringCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ background: 'var(--yellow-50)', border: '1px solid var(--yellow-100)', color: 'var(--yellow-700)' }}>
          <Shield aria-hidden className="h-4 w-4 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
          <span>
            <strong>{expiringCount} {t('warranties.expiringSoon30')}.</strong>
            {' '}{t('warranties.autoReminderNote')}
          </span>
        </div>
      )}

      <FilterBar
        searchPlaceholder={t('warranties.searchPlaceholder')}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        filters={
          <ConfigSelect
            listKey="warranty_status"
            value={status || 'all'}
            onValueChange={(v) => syncAllToUrl({ status: v === 'all' ? '' : v, page: '1' })}
            includeAll
            allLabel={t('warranties.allStatuses')}
            className="w-44"
          />
        }
      />

      <div className="bg-surface-card rounded-xl border border-border">
        <DataTable
          data={filtered}
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
            onSortChange: (f, d) => syncAllToUrl({ sortBy: f, sortDir: d === 'none' ? '' : d }),
            currentSortBy: sortBy,
            currentSortDir: sortDir,
          } : undefined}
        />
      </div>
    </div>
  );
}
