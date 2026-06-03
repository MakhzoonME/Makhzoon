'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Banknote, Receipt, TrendingUp, CreditCard } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, StatusBadge, StatCard } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { useTransactions, useHarakaReport } from '@/hooks/haraka';
import { useAdminGuard, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';
import { startOfDay, endOfDay } from 'date-fns';
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

  const todayRange = { from: startOfDay(new Date()), to: endOfDay(new Date()) };
  const { data: report, isLoading: reportLoading } = useHarakaReport({
    groupBy: 'day',
    from: todayRange.from,
    to: todayRange.to,
  });
  const { data: payReport, isLoading: payLoading } = useHarakaReport({
    groupBy: 'paymentMethod',
    from: todayRange.from,
    to: todayRange.to,
  });
  const todaySales = report?.totals.total ?? 0;
  const todayTxns = report?.totals.transactions ?? 0;
  const avgTicket = todayTxns > 0 ? todaySales / todayTxns : 0;
  const cardTotal = payReport?.buckets.find((b) => b.key === 'card')?.total ?? 0;
  const cardShare = todaySales > 0 ? Math.round((cardTotal / todaySales) * 100) : 0;

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Banknote className="w-[18px] h-[18px]" />}
          iconBg="rgba(194,24,91,0.08)" iconColor="var(--mod-haraka)"
          label={t('overview.todaysSales')}
          value={formatCurrency(todaySales)}
          loading={reportLoading}
        />
        <StatCard
          icon={<Receipt className="w-[18px] h-[18px]" />}
          iconBg="var(--primary-50)" iconColor="var(--primary-700)"
          label={t('overview.todaysTransactions')}
          value={todayTxns}
          loading={reportLoading}
        />
        <StatCard
          icon={<TrendingUp className="w-[18px] h-[18px]" />}
          iconBg="var(--blue-50)" iconColor="var(--blue-700)"
          label={t('overview.avgTicket')}
          value={formatCurrency(avgTicket)}
          loading={reportLoading}
        />
        <StatCard
          icon={<CreditCard className="w-[18px] h-[18px]" />}
          iconBg="var(--green-50)" iconColor="var(--green-700)"
          label={t('overview.cardShare')}
          value={`${cardShare}%`}
          loading={payLoading}
        />
      </div>

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
