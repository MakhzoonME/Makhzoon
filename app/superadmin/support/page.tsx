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

function sortTickets(rows: SupportTicket[], sortBy: string, sortDir: 'asc' | 'desc'): SupportTicket[] {
  const sorted = [...rows].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    switch (sortBy) {
      case 'subject':
        aVal = a.subject.toLowerCase();
        bVal = b.subject.toLowerCase();
        break;
      case 'priority': {
        const order: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        aVal = order[a.priority] ?? 99;
        bVal = order[b.priority] ?? 99;
        break;
      }
      case 'status': {
        const order: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 };
        aVal = order[a.status] ?? 99;
        bVal = order[b.status] ?? 99;
        break;
      }
      case 'created':
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
        break;
      default:
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });
  return sorted;
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
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc');

  const filters = {
    orgId: orgId || undefined,
    status: (status || undefined) as TicketStatus | undefined,
    priority: (priority || undefined) as TicketPriority | undefined,
  };
  const { data: allTickets = [], isLoading } = useSupportTickets(filters);
  const { data: orgs = [] } = useAllOrgsUsage();

  const orgNameById = useMemo(() => {
    return new Map(orgs.map((r) => [r.organization.id, r.organization.name]));
  }, [orgs]);

  const sorted = sortTickets(allTickets, sortBy, sortDir);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

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
    const urlSortBy = searchParams.get('sortBy') ?? 'created';
    const urlSortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    if (urlOrgId !== orgId) setOrgId(urlOrgId);
    if (urlStatus !== status) setStatus(urlStatus);
    if (urlPriority !== priority) setPriority(urlPriority);
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);
    if (urlSortBy !== sortBy) setSortBy(urlSortBy);
    if (urlSortDir !== sortDir) setSortDir(urlSortDir);
  }, [searchParams]);

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

  function handleSortChange(nextSortBy: string, nextSortDir: 'asc' | 'desc') {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    syncAllToUrl({ sortBy: nextSortBy, sortDir: nextSortDir });
  }

  const columns: ColumnDef<SupportTicket>[] = [
    {
      key: 'subject',
      header: t('support.subject'),
      sortable: true,
      render: (ticket) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{ticket.subject}</p>
          <p className="text-xs text-gray-500 dark:text-gray-300 line-clamp-1">{ticket.description}</p>
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
    { key: 'created', header: t('support.created'), sortable: true, render: (ticket) => formatDate(new Date(ticket.createdAt)) },
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

      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 mb-4">
        <select
          value={orgId}
          onChange={(e) => { setOrgId(e.target.value); setPage(1); syncAllToUrl({ orgId: e.target.value, page: '1' }); }}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
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
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
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
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
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

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={paginated}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('support.noMatch')}
          keyExtractor={(ticket) => ticket.id}
          pagination={{
            page: safePage,
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
