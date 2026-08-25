'use client';
import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
  const { t, locale } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const orgId = searchParams.get('orgId') ?? '';
  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' | 'none';

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
        <Button size="sm" variant="ghost" onClick={() => router.push(`/${locale}/superadmin/support/${ticket.id}`)}>
          {t('support.view')}
        </Button>
      ),
    },
  ];

  const clearFilters = () => {
    syncAllToUrl({ orgId: '', status: '', priority: '', page: '1' });
  };

  return (
    <div>
      <PageHeader title={t('nav.support')} description={t('support.description2')} breadcrumb={[{ label: t('nav.support') }]} />

      <div className="bg-surface-card border border-border rounded-lg p-3 flex flex-wrap gap-2 mb-4">
        <Combobox
          value={orgId || null}
          onChange={(v) => syncAllToUrl({ orgId: v ?? '', page: '1' })}
          options={orgs.map((r) => ({ value: r.organization.id, label: r.organization.name }))}
          placeholder={t('support.allOrgs')}
          searchable
          className="w-auto"
        />
        <Combobox
          value={status || null}
          onChange={(v) => syncAllToUrl({ status: v ?? '', page: '1' })}
          options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
          placeholder={t('support.anyStatus')}
          searchable={false}
          className="w-auto"
        />
        <Combobox
          value={priority || null}
          onChange={(v) => syncAllToUrl({ priority: v ?? '', page: '1' })}
          options={PRIORITIES.map((p) => ({ value: p, label: p }))}
          placeholder={t('support.anyPriority')}
          searchable={false}
          className="w-auto"
        />
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
            onPageChange: (p) => syncAllToUrl({ page: String(p) }),
            onPageSizeChange: (s) => syncAllToUrl({ pageSize: String(s), page: '1' }),
            onSortChange: handleSortChange,
            currentSortBy: sortBy,
            currentSortDir: sortDir,
          }}
        />
      </div>
    </div>
  );
}
