'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { PageHeader, DataTable, FilterBar } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { ServiceJobStatusBadge } from '@/components/haraka/ServiceJobStatusBadge';
import { TicketStatusBadge } from '@/components/haraka/TicketStatusBadge';
import { useReceptionTickets } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, useDebounce, useT } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/date';
import { useOrgInfo } from '@/hooks/org';
import type { HarakaReceptionTicket } from '@/types';

export default function ReceptionPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'reception', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.view_reception');
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  const { t } = useT();

  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useReceptionTickets({
    status: status === 'all' ? undefined : status,
    search: debouncedSearch.trim() || undefined,
    page,
    pageSize: 25,
  });

  if (!featureAllowed || !isAllowed) return null;

  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const currency = orgInfo?.currency ?? 'USD';

  const columns: ColumnDef<HarakaReceptionTicket>[] = [
    {
      key: 'ticketNumber',
      header: t('reception.colTicket'),
      render: (tk) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
          {tk.ticketNumber}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: t('col.customer'),
      render: (tk) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">{tk.customerName}</div>
          <div className="text-gray-400 text-xs">
            {[tk.customerPhone, tk.carPlate].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: t('reception.colContents'),
      render: (tk) => {
        const services = tk.serviceJob?.items.length ?? 0;
        return (
          <span className="text-xs text-gray-500">
            {tk.items.length > 0 && `${tk.items.length} ${t('reception.products')}`}
            {tk.items.length > 0 && services > 0 && ' · '}
            {services > 0 && `${services} ${t('reception.services')}`}
          </span>
        );
      },
    },
    {
      key: 'serviceJob',
      header: t('reception.colJob'),
      render: (tk) =>
        tk.serviceJob ? (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-gray-400">{tk.serviceJob.jobNumber}</span>
            <ServiceJobStatusBadge status={tk.serviceJob.status} />
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        ),
    },
    {
      key: 'grandTotal',
      header: t('col.total'),
      render: (tk) => <span className="font-mono text-sm tabular-nums">{formatCurrency(tk.grandTotal, currency)}</span>,
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (tk) => <TicketStatusBadge status={tk.status} />,
    },
    {
      key: 'createdAt',
      header: t('col.date'),
      render: (tk) => <span className="text-xs text-gray-400">{formatDate(tk.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reception.title')}
        description={t('reception.subtitle')}
        actions={
          <Button onClick={() => router.push(`${base}/reception/new`)} style={{ background: 'var(--mod-haraka)' }}>
            <Plus className="h-4 w-4 me-2" /> {t('reception.newTicket')}
          </Button>
        }
      />

      <FilterBar
        filters={[
          <div key="search" className="relative">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('reception.searchPlaceholder')}
              className="ps-9 w-72"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>,
          <ConfigSelect
            key="status"
            listKey="reception_ticket_status"
            value={status}
            onValueChange={(v) => { setStatus(v); setPage(1); }}
            includeAll
            allLabel={t('common.selectPlaceholder')}
            allValue="all"
            className="w-44"
          />,
        ]}
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage={t('reception.noTickets')}
        onRowClick={(tk) => router.push(`${base}/reception/${tk.id}`)}
        pagination={
          data && data.totalPages > 1
            ? { page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages, onPageChange: setPage }
            : undefined
        }
      />
    </div>
  );
}
