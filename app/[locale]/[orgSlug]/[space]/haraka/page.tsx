'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startOfDay, endOfDay } from 'date-fns';
import { Banknote, Receipt, Users, Layers, Plus, ListChecks, ArrowRight } from 'lucide-react';
import { useOrgSlug, useSpace, useT, useModuleGuard } from '@/hooks/ui';
import { PageHeader, StatCard, OverviewSection, DataTable, StatusBadge, SubscriptionGate } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/date';
import { useCurrentSession, useSessions, useTransactions, useCustomers, useHarakaReport } from '@/hooks/haraka';
import type { PosTransaction } from '@/types';

function SessionCard({ base }: { base: string }) {
  const router = useRouter();
  const { t } = useT();
  const { data, isLoading } = useCurrentSession();
  const session = data?.session ?? null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface-card p-5 space-y-2 animate-pulse">
        <div className="h-4 w-40 bg-surface-inset rounded" />
        <div className="h-3 w-64 bg-surface-inset rounded" />
      </div>
    );
  }

  if (session) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
            <span className="text-sm font-semibold text-green-700">{t('haraka.activeSession')}</span>
          </div>
          <p className="text-sm text-gray-600">
            {t('haraka.openedBy').replace('{name}', session.cashierName)}
            {' · '}{formatDate(session.openedAt)}
            {' · '}{formatCurrency(session.openingFloat)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push(`${base}/sessions/${session.id}`)}>
            {t('haraka.goToSession')}
          </Button>
          <Button size="sm" style={{ background: 'var(--mod-haraka)' }} onClick={() => router.push(`${base}/register`)}>
            {t('haraka.openRegister')} <ArrowRight className="h-4 w-4 ms-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-gray-900">{t('haraka.noOpenSession')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('haraka.openSessionDesc')}</p>
      </div>
      <SubscriptionGate>
        <Button size="sm" style={{ background: 'var(--mod-haraka)' }} onClick={() => router.push(`${base}/sessions`)}>
          <Plus className="h-4 w-4 me-1" /> {t('haraka.openNewSession')}
        </Button>
      </SubscriptionGate>
    </div>
  );
}

export default function HarakaOverviewPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  if (!isAllowed) return null;
  const base = `/${locale}/${orgSlug}/${space}/haraka`;

  const [range] = useState(() => {
    const now = new Date();
    return { from: startOfDay(now), to: endOfDay(now) };
  });

  const { data: report, isLoading: reportLoading } = useHarakaReport({ groupBy: 'day', from: range.from, to: range.to });
  const { data: openSessions, isLoading: sessionsLoading } = useSessions({ status: 'open', pageSize: 1 });
  const { data: customers, isLoading: customersLoading } = useCustomers({ pageSize: 1 });
  const { data: txns, isLoading: txnLoading } = useTransactions({ pageSize: 5 });

  const todaySales = report?.totals.total ?? 0;
  const todayTxns = report?.totals.transactions ?? 0;
  const openCount = openSessions?.total ?? 0;
  const customerCount = customers?.total ?? 0;
  const recent = txns?.items ?? [];

  const recentColumns: ColumnDef<PosTransaction>[] = [
    {
      key: 'receiptNumber',
      header: t('haraka.receipt'),
      render: (x) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
          {x.receiptNumber}
        </span>
      ),
    },
    {
      key: 'total',
      header: t('haraka.amount'),
      render: (x) => <span className="font-mono font-medium text-sm">{formatCurrency(x.total)}</span>,
    },
    {
      key: 'cashierName',
      header: t('haraka.cashier'),
      render: (x) => <span className="text-sm text-gray-600">{x.cashierName}</span>,
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (x) => <StatusBadge status={x.parentTransactionId ? 'credit_note' : x.status} />,
    },
    {
      key: 'createdAt',
      header: t('col.date'),
      render: (x) => (
        <span className="text-xs font-mono text-gray-500">
          {new Date(x.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.pos')}
        description={t('overview.haraka.subtitle')}
        actions={
          <Button size="sm" variant="outline" onClick={() => router.push(`${base}/sessions`)}>
            <ListChecks className="h-4 w-4 me-1" strokeWidth={1.75} />
            {t('haraka.sessions')}
          </Button>
        }
      />

      <SessionCard base={base} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Banknote className="w-[18px] h-[18px]" />}
          iconBg="rgba(194,24,91,0.08)" iconColor="var(--mod-haraka)"
          label={t('overview.todaysSales')}
          value={formatCurrency(todaySales)}
          loading={reportLoading}
          onClick={() => router.push(`${base}/reports`)}
        />
        <StatCard
          icon={<Receipt className="w-[18px] h-[18px]" />}
          iconBg="var(--primary-50)" iconColor="var(--primary-700)"
          label={t('overview.todaysTransactions')}
          value={todayTxns}
          loading={reportLoading}
          onClick={() => router.push(`${base}/transactions`)}
        />
        <StatCard
          icon={<Layers className="w-[18px] h-[18px]" />}
          iconBg="var(--yellow-50)" iconColor="var(--yellow-700)"
          label={t('overview.openSessions')}
          value={openCount}
          loading={sessionsLoading}
          onClick={() => router.push(`${base}/sessions`)}
        />
        <StatCard
          icon={<Users className="w-[18px] h-[18px]" />}
          iconBg="var(--blue-50)" iconColor="var(--blue-700)"
          label={t('overview.customers')}
          value={customerCount}
          loading={customersLoading}
          onClick={() => router.push(`${base}/customers`)}
        />
      </div>

      <OverviewSection
        title={t('overview.recentTransactions')}
        actionLabel={t('dashboard.viewAll')}
        onAction={() => router.push(`${base}/transactions`)}
        padded={false}
      >
        <DataTable
          data={recent}
          columns={recentColumns}
          isLoading={txnLoading}
          emptyMessage={t('haraka.noTransactions')}
          onRowClick={(x) => router.push(`${base}/transactions/${x.id}`)}
          keyExtractor={(x) => x.id}
        />
      </OverviewSection>
    </div>
  );
}
