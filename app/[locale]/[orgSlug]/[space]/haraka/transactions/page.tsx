'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader, DataTable, FilterBar, StatusBadge } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { useTransactions } from '@/hooks/haraka';
import { useAdminGuard, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import type { PosTransaction } from '@/types';

type StatusFilter = 'all' | 'completed' | 'refunded' | 'voided';

export default function TransactionsListPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { isAllowed } = useAdminGuard('pos.view_reports');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactions({
    status: status === 'all' ? undefined : status,
    page,
    pageSize: 25,
  });

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const columns: ColumnDef<PosTransaction>[] = [
    {
      key: 'receiptNumber',
      header: 'Receipt',
      render: (t) => <span className="font-mono text-xs">{t.receiptNumber}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (t) => new Date(t.createdAt).toLocaleString(),
    },
    { key: 'cashierName', header: 'Cashier', render: (t) => t.cashierName || '—' },
    {
      key: 'customerName',
      header: 'Customer',
      render: (t) => t.customerName ?? '—',
    },
    {
      key: 'total',
      header: 'Total',
      render: (t) => <span className="font-mono">{t.total.toFixed(2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: 'fawtara',
      header: 'Jo Fotara',
      render: (t) => (t.fawtara ? <StatusBadge status={t.fawtara.status} /> : <span className="text-gray-400 text-xs">—</span>),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Transactions"
        description="All sales, refunds and voids across the organization."
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: t('nav.transactions') },
        ]}
      />

      <FilterBar
        filters={
          <ConfigSelect listKey="pos_txn_status" value={status} onValueChange={(v) => { setStatus(v as StatusFilter); setPage(1); }} includeAll allLabel="All" className="w-44" />
        }
      />

      <DataTable<PosTransaction>
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        emptyMessage="No transactions in the selected range."
        onRowClick={(t) => router.push(`/${params.locale}/${params.orgSlug}/${params.space}/haraka/transactions/${t.id}`)}
        pagination={
          data
            ? {
                page: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPages: data.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
