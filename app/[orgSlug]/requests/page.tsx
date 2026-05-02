'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useOrgSlug } from '@/hooks/ui';
import { useRequests } from '@/hooks/requests';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge, SubscriptionGate } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Request } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { truncate } from '@/lib/utils/format';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useT } from '@/hooks/ui';
function CheckSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

const typeLabels: Record<string, string> = {
  REFILL: 'Refill',
  RETIRE: 'Retire',
  BUY_NEW: 'Buy New',
  EXTEND_WARRANTY: 'Extend Warranty',
};

export default function RequestsPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const [page, setPage] = useState(searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1);
  const [pageSize, setPageSize] = useState(searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc');

  const [processing, setProcessing] = useState<string | null>(null);

  const { data: requestsData, isLoading } = useRequests({
    status: status || undefined,
    type: type || undefined,
    page,
    pageSize,
    sortBy,
    sortDir,
  });
  const requests = requestsData?.items ?? [];

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    const urlStatus = searchParams.get('status') ?? '';
    const urlType = searchParams.get('type') ?? '';
    const urlPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const urlPageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
    const urlSortBy = searchParams.get('sortBy') ?? 'createdAt';
    const urlSortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    if (urlStatus !== status) setStatus(urlStatus);
    if (urlType !== type) setType(urlType);
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);
    if (urlSortBy !== sortBy) setSortBy(urlSortBy);
    if (urlSortDir !== sortDir) setSortDir(urlSortDir);
  }, [searchParams]);

  async function handleDecision(requestId: string, action: 'approve' | 'reject') {
    setProcessing(requestId);
    try {
      const res = await fetch(`/api/requests/${requestId}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed to ${action} request`);
      }
      toast.success(action === 'approve' ? t('requests.approved') : t('requests.rejected'));
      qc.invalidateQueries({ queryKey: ['requests'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  }

  function syncAllToUrl(next: Partial<Record<'status' | 'type' | 'page' | 'pageSize' | 'sortBy' | 'sortDir', string>>) {
    updateUrl({
      status: next.status ?? status,
      type: next.type ?? type,
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

  function handleTypeChange(v: string) {
    const next = v === 'all' ? '' : v;
    setType(next);
    setPage(1);
    syncAllToUrl({ type: next, page: '1' });
  }

  function handleSortChange(sortByField: string, dir: 'asc' | 'desc') {
    setSortBy(sortByField);
    setSortDir(dir);
    syncAllToUrl({ sortBy: sortByField, sortDir: dir });
  }

  const columns: ColumnDef<Request>[] = [
    { key: 'type', header: t('requests.type'), sortable: true, render: (r) => <span className="font-medium text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{typeLabels[r.type] ?? r.type}</span> },
    {
      key: 'assetId', header: t('requests.reference'),
      render: (r) => {
        if (r.assetId) return <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/${orgSlug}/assets/${r.assetId}`)}>{r.assetName ?? r.assetId}</button>;
        if (r.inventoryItemId) return <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/${orgSlug}/inventory/${r.inventoryItemId}`)}>{r.inventoryItemName ?? r.inventoryItemId}</button>;
        return <span className="text-gray-400">—</span>;
      }
    },
    { key: 'createdBy', header: t('requests.submittedBy'), sortable: true, render: (r) => r.createdByName ?? r.createdByEmail ?? r.createdBy },
    { key: 'createdAt', header: t('col.date'), sortable: true, render: (r) => formatDate(r.createdAt) },
    { key: 'description', header: t('requests.description'), render: (r) => <span className="text-gray-600 dark:text-gray-300">{truncate(r.description, 60)}</span> },
    { key: 'status', header: t('col.status'), sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: t('col.actions'),
      render: (r) => isAdmin && r.status === 'PENDING' ? (
        <div className="flex gap-1">
          <SubscriptionGate>
            <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'approve'); }}>
              <CheckSVG />
            </Button>
          </SubscriptionGate>
          <SubscriptionGate>
            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'reject'); }}>
              <XSVG />
            </Button>
          </SubscriptionGate>
        </div>
      ) : null
    },
  ];

  return (
    <div>
      <PageHeader title={t('nav.requests')} />

      <FilterBar
        filters={
          <div className="flex items-center gap-2">
            <Select value={status || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t('col.status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('requests.allStatuses')}</SelectItem>
                <SelectItem value="PENDING">{t('requests.pending')}</SelectItem>
                <SelectItem value="APPROVED">{t('requests.approved')}</SelectItem>
                <SelectItem value="REJECTED">{t('requests.rejected')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type || 'all'} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t('requests.type')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('requests.allTypes')}</SelectItem>
                <SelectItem value="REFILL">Refill</SelectItem>
                <SelectItem value="RETIRE">Retire</SelectItem>
                <SelectItem value="BUY_NEW">Buy New</SelectItem>
                <SelectItem value="EXTEND_WARRANTY">Extend Warranty</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={requests}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('requests.noRequests')}
          keyExtractor={(r) => r.id}
          pagination={requestsData ? {
            page: requestsData.page,
            pageSize: requestsData.pageSize,
            total: requestsData.total,
            totalPages: requestsData.totalPages,
            onPageChange: (p) => { setPage(p); syncAllToUrl({ page: String(p) }); },
            onPageSizeChange: (s) => { setPageSize(s); setPage(1); syncAllToUrl({ pageSize: String(s), page: '1' }); },
            onSortChange: handleSortChange,
            currentSortBy: sortBy,
            currentSortDir: sortDir,
          } : undefined}
        />
      </div>
    </div>
  );
}
