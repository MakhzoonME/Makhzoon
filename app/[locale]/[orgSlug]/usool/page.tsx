'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Boxes, CheckCircle2, Archive, ShieldAlert, Plus, Upload } from 'lucide-react';
import { useOrgSlug, useT } from '@/hooks/ui';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader, StatCard, OverviewSection, DataTable, StatusBadge, SubscriptionGate } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/lib/permissions';
import { formatDate } from '@/lib/utils/date';
import { Asset } from '@/types';

function useUsoolOverview() {
  return useQuery({
    queryKey: ['usool-overview'],
    queryFn: async () => {
      const [totalRes, activeRes, retiredRes, recentRes, warrRes] = await Promise.all([
        fetch('/api/assets?pageSize=1'),
        fetch('/api/assets?status=Active&pageSize=1'),
        fetch('/api/assets?status=Retired&pageSize=1'),
        fetch('/api/assets?pageSize=6&sortBy=createdAt&sortDir=desc'),
        fetch('/api/warranties?expiringSoon=true'),
      ]);
      const total = totalRes.ok ? (await totalRes.json())?.total ?? 0 : 0;
      const active = activeRes.ok ? (await activeRes.json())?.total ?? 0 : 0;
      const retired = retiredRes.ok ? (await retiredRes.json())?.total ?? 0 : 0;
      const recentBody = recentRes.ok ? await recentRes.json() : { items: [] };
      const recent: Asset[] = Array.isArray(recentBody?.items) ? recentBody.items : [];
      const warrBody = warrRes.ok ? await warrRes.json() : [];
      const expiring = Array.isArray(warrBody) ? warrBody.length : 0;
      return { total, active, retired, recent, expiring };
    },
    staleTime: 30_000,
  });
}

function StatusBreakdown({ active, retired, total, isLoading }: { active: number; retired: number; total: number; isLoading: boolean }) {
  const { t } = useT();
  const other = Math.max(0, total - active - retired);
  const denom = total || 1;
  const rows = [
    { label: t('dashboard.active'), count: active, bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
    { label: t('dashboard.retired'), count: retired, bar: 'bg-gray-400', text: 'text-gray-600' },
    { label: t('overview.other'), count: other, bar: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400' },
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
    return <p className="text-sm text-gray-500 py-4 text-center">{t('assets.noAssets')}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = Math.round((r.count / denom) * 100);
        return (
          <div key={r.label} className="grid grid-cols-[100px_1fr_64px] gap-3 items-center py-1 border-b border-border last:border-0">
            <span className="text-sm font-medium text-gray-700 truncate">{r.label}</span>
            <div className="h-1.5 rounded-full bg-surface-sidebar overflow-hidden">
              <div className={`h-full rounded-full ${r.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-medium tabular-nums text-right ${r.text}`}>{r.count} · {pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function UsoolOverviewPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const { t, locale } = useT();
  const { data, isLoading } = useUsoolOverview();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';
  const canCreateAsset = !!user && hasPermission(user, 'assets', 'create');

  const total = data?.total ?? 0;
  const active = data?.active ?? 0;
  const retired = data?.retired ?? 0;
  const expiring = data?.expiring ?? 0;
  const recent = data?.recent ?? [];

  const base = `/${locale}/${orgSlug}/usool`;

  const recentColumns: ColumnDef<Asset>[] = [
    { key: 'name', header: t('col.name'), render: (a) => <span className="font-medium text-gray-900 text-sm">{a.name}</span> },
    { key: 'category', header: t('col.category'), render: (a) => <span className="text-sm text-gray-600">{a.category}</span> },
    { key: 'status', header: t('col.status'), render: (a) => <StatusBadge status={a.status} marker="dot" /> },
    { key: 'createdAt', header: t('col.date'), render: (a) => <span className="text-sm text-gray-500 tabular-nums">{a.createdAt ? formatDate(a.createdAt) : '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.assets')}
        description={t('overview.assets.subtitle')}
        actions={(isAdmin || canCreateAsset) ? (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <SubscriptionGate>
                <Button size="sm" variant="outline" onClick={() => router.push(`${base}/import`)}>
                  <Upload className="w-4 h-4" /><span className="ms-1">{t('assets.importCsv')}</span>
                </Button>
              </SubscriptionGate>
            )}
            {canCreateAsset && (
              <SubscriptionGate>
                <Button size="sm" onClick={() => router.push(`${base}/new`)}>
                  <Plus className="w-4 h-4" /><span className="ms-1">{t('assets.addAsset')}</span>
                </Button>
              </SubscriptionGate>
            )}
          </div>
        ) : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Boxes className="w-[18px] h-[18px]" />}
          iconBg="var(--primary-50)" iconColor="var(--primary-700)"
          label={t('dashboard.totalAssets')}
          value={total}
          loading={isLoading}
          onClick={() => router.push(`${base}/list`)}
        />
        <StatCard
          icon={<CheckCircle2 className="w-[18px] h-[18px]" />}
          iconBg="var(--green-50)" iconColor="var(--green-700)"
          label={t('dashboard.active')}
          value={active}
          sub={total > 0 ? `${Math.round((active / total) * 100)}${t('dashboard.percentOfTotal')}` : undefined}
          loading={isLoading}
          onClick={() => router.push(`${base}/list?status=Active`)}
        />
        <StatCard
          icon={<Archive className="w-[18px] h-[18px]" />}
          iconBg="var(--surface-sidebar)" iconColor="var(--gray-600, #4b5563)"
          label={t('dashboard.retired')}
          value={retired}
          loading={isLoading}
          onClick={() => router.push(`${base}/list?status=Retired`)}
        />
        <StatCard
          icon={<ShieldAlert className="w-[18px] h-[18px]" />}
          iconBg="var(--yellow-50)" iconColor="var(--yellow-700)"
          label={t('dashboard.warrantiesExpiring')}
          value={expiring}
          loading={isLoading}
          onClick={() => router.push(`/${locale}/${orgSlug}/warranties?expiring=30`)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <OverviewSection
          className="lg:col-span-3"
          title={t('overview.recentlyAdded')}
          actionLabel={t('dashboard.viewAll')}
          onAction={() => router.push(`${base}/list`)}
          padded={false}
        >
          <DataTable
            data={recent}
            columns={recentColumns}
            isLoading={isLoading}
            emptyMessage={t('assets.noAssets')}
            onRowClick={(a) => router.push(`${base}/${a.id}`)}
            keyExtractor={(a) => a.id}
          />
        </OverviewSection>

        <OverviewSection className="lg:col-span-2" title={t('overview.byStatus')}>
          <StatusBreakdown active={active} retired={retired} total={total} isLoading={isLoading} />
        </OverviewSection>
      </div>
    </div>
  );
}
