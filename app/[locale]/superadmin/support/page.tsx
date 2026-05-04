'use client';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { useSupportTickets } from '@/hooks/support';
import { useAllOrgsUsage } from '@/hooks/org';
import { formatDate } from '@/lib/utils/date';
import type { SupportTicket, TicketStatus, TicketPriority } from '@/types';
import { useT } from '@/hooks/ui';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

export default function SupportPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [orgId, setOrgId] = useState(searchParams.get('orgId') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [priority, setPriority] = useState(searchParams.get('priority') ?? '');
  const [page, setPage] = useState(searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1);
  const [pageSize, setPageSize] = useState(searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | 'none'>(searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc');

  const filters = {
    orgId: orgId || undefined,
    status: (status || undefined) as TicketStatus | undefined,
    priority: (priority || undefined) as TicketPriority | undefined,
    page,
    pageSize,
    sortBy: sortDir === 'none' ? undefined : sortBy,
    sortDir: sortDir === 'none' ? undefined : sortDir,
  };
  const { data: ticketsData, isLoading } = useSupportTickets(filters);
  const tickets = ticketsData?.items ?? [];
  const total = ticketsData?.total ?? 0;
  const totalPages = ticketsData?.totalPages ?? 1;
  const { data: orgs = [] } = useAllOrgsUsage();

  const orgNameById = useMemo(() => {
    return new Map(orgs.map((r) => [r.organization.id, r.organization.name]));
  }, [orgs]);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    const urlOrgId = searchParams.get('orgId') ?? '';
    const urlStatus = searchParams.get('status') ?? '';
    const urlPriority = searchParams.get('priority') ?? '';
    const urlPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const urlPageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
    const urlSortBy = searchParams.get('sortBy') ?? 'createdAt';
    const urlSortDir = (searchParams.get('sortDir') ?? 'desc') as 'asc' | 'desc' | 'none';

    if (urlOrgId !== orgId) setOrgId(urlOrgId);
    if (urlStatus !== status) setStatus(urlStatus);
    if (urlPriority !== priority) setPriority(urlPriority);
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);
    if (urlSortBy !== sortBy) setSortBy(urlSortBy);
    if (urlSortDir !== sortDir) setSortDir(urlSortDir);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  function syncAllToUrl(next: Partial<Record<'orgId' | 'status' | 'priority' | 'page' | 'pageSize' | 'sortBy' | 'sortDir', string>>) {
    updateUrl({
      orgId: next.orgId ?? orgId,
      status: next.status ?? status,
      priority: next.priority ?? priority,
      page: next.page ?? String(page),
      pageSize: next.pageSize ?? String(pageSize),
      sortBy: next.sortBy ?? sortBy,
      sortDir: next.sortDir ?? sortDir,
    });
  }

  function handleSortChange(nextSortBy: string, nextSortDir: 'asc' | 'desc' | 'none') {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setPage(1);
    syncAllToUrl({ sortBy: nextSortBy, sortDir: nextSortDir === 'none' ? '' : nextSortDir, page: '1' });
  }

  const columns: ColumnDef<SupportTicket>[] = [
    {
      key: 'subject',
      header: t('support.subject'),
      sortable: true,
      render: (ticket) => (
        <div>
          <p className="font-medium text-gray-900 line-clamp-1">{ticket.subject}</p>
          <p className="text-xs text-gray-500 line-clamp-1">{ticket.description}</p>
        </div>
      ),
    },
    {
      key: 'org',
      header: t('auditLogs.organization'),
      render: (ticket) => orgNameById.get(ticket.organizationId) ?? <span className="font-mono text-xs text-gray-500">{ticket.organizationId.slice(0, 8)}…</span>,
    },
    { key: 'priority', header: t('support.priority'), sortable: true, render: (ticket) => <StatusBadge status={ticket.priority} /> },
    { key: 'status', header: t('support.status'), sortable: true, render: (ticket) => <StatusBadge status={ticket.status} /> },
    { key: 'createdAt', header: t('support.created'), sortable: true, render: (ticket) => formatDate(new Date(ticket.createdAt)) },
    {
      key: 'actions',
      header: '',
      render: (ticket) => (
        <Button size="sm" variant="ghost" onClick={() => router.push(`/superadmin/support/${ticket.id}`)}>
          {t('support.view')}
        </Button>
      ),
    },
  ];

  const clearFilters = () => {
    setOrgId('');
    setStatus('');
    setPriority('');
    setPage(1);
    syncAllToUrl({ orgId: '', status: '', priority: '', page: '1' });
  };

  return (
    <div>
      <PageHeader title={t('nav.support')} description={t('support.description2')} />

      <div className="bg-surface-card border border-border rounded-lg p-3 flex flex-wrap gap-2 mb-4">
        <select
          value={orgId}
          onChange={(e) => { setOrgId(e.target.value); setPage(1); syncAllToUrl({ orgId: e.target.value, page: '1' }); }}
          className="h-9 rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
        >
          <option value="">{t('support.allOrgs')}</option>
          {orgs.map((r) => (
            <option key={r.organization.id} value={r.organization.id}>
              {r.organization.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); syncAllToUrl({ status: e.target.value, page: '1' }); }}
          className="h-9 rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
        >
          <option value="">{t('support.anyStatus')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => { setPriority(e.target.value); setPage(1); syncAllToUrl({ priority: e.target.value, page: '1' }); }}
          className="h-9 rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
        >
          <option value="">{t('support.anyPriority')}</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {(orgId || status || priority) && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            {t('orgs.clear')}
          </Button>
        )}
      </div>

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={tickets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('support.noMatch')}
          keyExtractor={(ticket) => ticket.id}
          pagination={{
            page,
            pageSize,
            total,
            totalPages,
            onPageChange: (p) => { setPage(p); syncAllToUrl({ page: String(p) }); },
            onPageSizeChange: (s) => { setPageSize(s); setPage(1); syncAllToUrl({ pageSize: String(s), page: '1' }); },
            onSortChange: handleSortChange,
            currentSortBy: sortBy,
            currentSortDir: sortDir,
          }}
        />
      </div>
    </div>
  );
}
