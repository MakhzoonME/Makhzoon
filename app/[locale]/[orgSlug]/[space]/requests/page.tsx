'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Inbox, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useOrgSlug, useSpace, useT, useModuleGuard } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { PageHeader, StatCard, OverviewSection, DataTable, StatusBadge } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { formatDate } from '@/lib/utils/date';
import { Request } from '@/types';
import type { MessageKey } from '@/locales/messages';

const typeKeys: Record<string, MessageKey> = {
  REFILL: 'requestType.REFILL',
  RETIRE: 'requestType.RETIRE',
  BUY_NEW: 'requestType.BUY_NEW',
  EXTEND_WARRANTY: 'requestType.EXTEND_WARRANTY',
};

function useRequestsOverview(space: string | null) {
  return useQuery({
    queryKey: ['requests-overview', space],
    enabled: !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const [allRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/requests?pageSize=6&sortBy=createdAt&sortDir=desc', { headers }),
        fetch('/api/requests?status=PENDING&pageSize=1', { headers }),
        fetch('/api/requests?status=APPROVED&pageSize=1', { headers }),
        fetch('/api/requests?status=REJECTED&pageSize=1', { headers }),
      ]);
      const allBody = allRes.ok ? await allRes.json() : { items: [], total: 0 };
      const recent: Request[] = Array.isArray(allBody?.items) ? allBody.items : [];
      const total = allBody?.total ?? 0;
      const pending = pendingRes.ok ? (await pendingRes.json())?.total ?? 0 : 0;
      const approved = approvedRes.ok ? (await approvedRes.json())?.total ?? 0 : 0;
      const rejected = rejectedRes.ok ? (await rejectedRes.json())?.total ?? 0 : 0;
      return { total, pending, approved, rejected, recent };
    },
    staleTime: 30_000,
  });
}

function StatusBreakdown({ pending, approved, rejected, total, isLoading }: { pending: number; approved: number; rejected: number; total: number; isLoading: boolean }) {
  const { t } = useT();
  const denom = total || 1;
  const rows = [
    { label: t('overview.pending'), count: pending, bar: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400' },
    { label: t('overview.approved'), count: approved, bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
    { label: t('overview.rejected'), count: rejected, bar: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="grid grid-cols-[100px_1fr_64px] gap-3 items-center">
            <div className="h-4 bg-surface-sidebar rounded animate-pulse" />
            <div className="h-1.5 bg-surface-sidebar rounded-full animate-pulse" />
            <div className="h-4 w-12 bg-surface-sidebar rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (total === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">{t('requests.noRequests')}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = Math.round((r.count / denom) * 100);
        return (
          <div key={r.label} className="grid grid-cols-[100px_1fr_64px] gap-3 items-center py-1 border-b border-border last:border-0">
            <span className="text-sm font-medium text-gray-700 truncate">{r.label}</span>
            <div className="h-1.5 rounded-full bg-surface-sidebar overflow-hidden">
              <div className={`h-full rounded-full ${r.bar} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-medium tabular-nums text-end ${r.text}`}>{r.count} · {pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function RequestsOverviewPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'requests', moduleKey: 'requests' });
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  if (!isAllowed) return null;
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = useRequestsOverview(space);

  const total = data?.total ?? 0;
  const pending = data?.pending ?? 0;
  const approved = data?.approved ?? 0;
  const rejected = data?.rejected ?? 0;
  const recent = data?.recent ?? [];

  const base = `/${locale}/${orgSlug}/${space}/requests`;

  const recentColumns: ColumnDef<Request>[] = [
    { key: 'type', header: t('requests.type'), render: (r) => <span className="font-medium text-xs bg-[var(--primary-100)] text-[var(--primary-700)] px-2 py-0.5 rounded-full">{typeKeys[r.type] ? t(typeKeys[r.type]) : r.type}</span> },
    {
      key: 'reference', header: t('requests.reference'),
      render: (r) => {
        if (r.assetId) return <button className="text-primary-600 hover:text-primary-700 hover:underline text-sm cursor-pointer transition-colors duration-150" onClick={() => router.push(`/${locale}/${orgSlug}/${space}/usool/${r.assetId}`)}>{r.assetName ?? r.assetId}</button>;
        if (r.inventoryItemId) return <button className="text-primary-600 hover:text-primary-700 hover:underline text-sm cursor-pointer transition-colors duration-150" onClick={() => router.push(`/${locale}/${orgSlug}/${space}/raseed/${r.inventoryItemId}`)}>{r.inventoryItemName ?? r.inventoryItemId}</button>;
        return <span className="text-gray-400">—</span>;
      },
    },
    { key: 'createdBy', header: t('requests.submittedBy'), render: (r) => <span className="text-sm text-gray-600">{r.createdByName ?? r.createdByEmail ?? r.createdBy}</span> },
    { key: 'createdAt', header: t('col.date'), render: (r) => <span className="text-sm text-gray-500 tabular-nums">{formatDate(r.createdAt)}</span> },
    { key: 'status', header: t('col.status'), render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.requests')}
        description={t('overview.requests.subtitle')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.requests') },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock aria-hidden className="w-[18px] h-[18px]" />}
          iconBg="var(--yellow-50)" iconColor="var(--yellow-700)"
          label={t('overview.pending')}
          value={pending}
          sub={pending > 0 ? t('overview.needReview') : undefined}
          loading={isLoading}
          onClick={() => router.push(`${base}/list?status=PENDING`)}
        />
        <StatCard
          icon={<CheckCircle2 aria-hidden className="w-[18px] h-[18px]" />}
          iconBg="var(--green-50)" iconColor="var(--green-700)"
          label={t('overview.approved')}
          value={approved}
          loading={isLoading}
          onClick={() => router.push(`${base}/list?status=APPROVED`)}
        />
        <StatCard
          icon={<XCircle aria-hidden className="w-[18px] h-[18px]" />}
          iconBg="var(--red-50)" iconColor="var(--red-700)"
          label={t('overview.rejected')}
          value={rejected}
          loading={isLoading}
          onClick={() => router.push(`${base}/list?status=REJECTED`)}
        />
        <StatCard
          icon={<Inbox aria-hidden className="w-[18px] h-[18px]" />}
          iconBg="var(--primary-50)" iconColor="var(--primary-700)"
          label={t('overview.totalRequests')}
          value={total}
          loading={isLoading}
          onClick={() => router.push(`${base}/list`)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <OverviewSection
          className="lg:col-span-3"
          title={t('overview.recentRequests')}
          actionLabel={t('dashboard.viewAll')}
          onAction={() => router.push(`${base}/list`)}
          padded={false}
        >
          <DataTable
            data={recent}
            columns={recentColumns}
            isLoading={isLoading}
            emptyMessage={t('requests.noRequests')}
            keyExtractor={(r) => r.id}
            onRowClick={(r) => router.push(`${base}/${r.id}`)}
          />
        </OverviewSection>

        <OverviewSection className="lg:col-span-2" title={t('overview.byStatus')}>
          <StatusBreakdown pending={pending} approved={approved} rejected={rejected} total={total} isLoading={isLoading} />
        </OverviewSection>
      </div>
    </div>
  );
}
