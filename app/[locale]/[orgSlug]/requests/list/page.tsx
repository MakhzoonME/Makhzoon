'use client';
import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useOrgSlug } from '@/hooks/ui';
import { useRequests } from '@/hooks/requests';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge, SubscriptionGate } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { Request } from '@/types';
import type { MessageKey } from '@/locales/messages';
import { formatDate } from '@/lib/utils/date';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useT } from '@/hooks/ui';
import { Check, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

const typeKeys: Record<string, MessageKey> = {
  REFILL: 'requestType.REFILL',
  RETIRE: 'requestType.RETIRE',
  BUY_NEW: 'requestType.BUY_NEW',
  EXTEND_WARRANTY: 'requestType.EXTEND_WARRANTY',
};

export default function RequestsListPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const status = searchParams.get('status') ?? '';
  const type = searchParams.get('type') ?? '';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : searchParams.get('sortDir') === 'none' ? 'none' : 'desc') as 'asc' | 'desc' | 'none';

  const [processing, setProcessing] = useState<string | null>(null);

  const { data: requestsData, isLoading } = useRequests({
    status: status || undefined,
    type: type || undefined,
    page,
    pageSize,
    sortBy: sortDir === 'none' ? undefined : sortBy,
    sortDir: sortDir === 'none' ? undefined : sortDir,
  });
  const requests = requestsData?.items ?? [];

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

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
    syncAllToUrl({ status: next, page: '1' });
  }

  function handleTypeChange(v: string) {
    const next = v === 'all' ? '' : v;
    syncAllToUrl({ type: next, page: '1' });
  }

  function handleSortChange(sortByField: string, dir: 'asc' | 'desc' | 'none') {
    syncAllToUrl({ sortBy: sortByField, sortDir: dir === 'none' ? '' : dir });
  }

  const columns: ColumnDef<Request>[] = [
    { key: 'type', header: t('requests.type'), sortable: true, render: (r) => <span className="font-medium text-xs bg-[var(--primary-100)] text-[var(--primary-700)] px-2 py-0.5 rounded-full">{typeKeys[r.type] ? t(typeKeys[r.type]) : r.type}</span> },
    {
      key: 'assetId', header: t('requests.reference'),
      render: (r) => {
        if (r.assetId) return <button className="text-primary-600 hover:underline" onClick={() => router.push(`/${locale}/${orgSlug}/usool/${r.assetId}`)}>{r.assetName ?? r.assetId}</button>;
        if (r.inventoryItemId) return <button className="text-primary-600 hover:underline" onClick={() => router.push(`/${locale}/${orgSlug}/raseed/${r.inventoryItemId}`)}>{r.inventoryItemName ?? r.inventoryItemId}</button>;
        return <span className="text-gray-400">—</span>;
      }
    },
    { key: 'createdBy', header: t('requests.submittedBy'), sortable: true, render: (r) => r.createdByName ?? r.createdByEmail ?? r.createdBy },
    { key: 'createdAt', header: t('col.date'), sortable: true, render: (r) => formatDate(r.createdAt) },
    { key: 'description', header: t('requests.description'), render: (r) => (
      <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><span className="text-gray-600 block truncate max-w-[280px]">{r.description}</span></TooltipTrigger><TooltipContent>{r.description}</TooltipContent></Tooltip></TooltipProvider>
    ) },
    { key: 'status', header: t('col.status'), sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: t('col.actions'),
      render: (r) => isAdmin && r.status === 'PENDING' ? (
        <div className="flex gap-1">
          <SubscriptionGate>
            <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'approve'); }}>
              <Check className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </SubscriptionGate>
          <SubscriptionGate>
            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'reject'); }}>
              <X className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </SubscriptionGate>
        </div>
      ) : null
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.requestsList')}
        breadcrumb={[
          { label: t('nav.requests'), href: `/${locale}/${orgSlug}/requests` },
          { label: t('nav.requestsList'), href: `/${locale}/${orgSlug}/requests/list` },
        ]}
      />

      <FilterBar
        filters={
          <div className="flex items-center gap-2">
            <ConfigSelect listKey="request_status" value={status || 'all'} onValueChange={handleStatusChange} includeAll allLabel={t('requests.allStatuses')} className="w-32" />
            <ConfigSelect listKey="request_type" value={type || 'all'} onValueChange={handleTypeChange} includeAll allLabel={t('requests.allTypes')} className="w-40" />
          </div>
        }
      />

      <div className="bg-surface-card rounded-lg border border-border">
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
