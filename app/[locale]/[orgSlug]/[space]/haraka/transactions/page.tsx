'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Banknote, Receipt, TrendingUp, CreditCard } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, StatusBadge, StatCard } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { useTransactions, useHarakaReport } from '@/hooks/haraka';
import { useAdminGuard, useT, useModuleGuard } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';
import { startOfDay, endOfDay } from 'date-fns';
import type { PosTransaction } from '@/types';

type StatusFilter = 'all' | 'completed' | 'refunded' | 'voided';

export default function TransactionsListPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.view_orders');
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
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

  if (!featureAllowed || !isAllowed) {
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
      render: (tx) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
          {tx.receiptNumber}
        </span>
      ),
    },
    {
      key: 'items' as keyof PosTransaction,
      header: 'Items',
      render: (tx) => (
        <span className="text-sm text-gray-500 font-mono">{tx.items?.length ?? '—'}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (tx) => <span className="text-sm text-gray-600">{tx.customerName ?? '—'}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (tx) => (
        <span className="font-mono font-semibold text-sm" style={tx.status === 'voided' ? { textDecoration: 'line-through', color: 'var(--text-tertiary)' } : {}}>
          {tx.total.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'payments' as keyof PosTransaction,
      header: 'Payment',
      render: (tx) => {
        const method = tx.payments?.[0]?.method;
        if (!method) return <span className="text-gray-400 text-xs">—</span>;
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={method === 'card'
              ? { background: 'var(--blue-100)', color: 'var(--blue-700)' }
              : { background: 'var(--green-100)', color: 'var(--green-700)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {method === 'card' ? 'Card' : 'Cash'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (tx) => <StatusBadge status={tx.parentTransactionId ? 'credit_note' : tx.status} />,
    },
    {
      key: 'fawtara',
      header: 'Fawtara',
      render: (tx) => tx.fawtara
        ? <StatusBadge status={tx.fawtara.status} />
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: 'createdAt',
      header: 'Time',
      sortable: true,
      render: (tx) => (
        <span className="font-mono text-xs text-gray-500">
          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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
