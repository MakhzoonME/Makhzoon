'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Boxes, PackageCheck, AlertTriangle, PackageX, Plus, ClipboardCheck } from 'lucide-react';
import { useOrgSlug, useT } from '@/hooks/ui';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader, StatCard, OverviewSection, DataTable, SubscriptionGate } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { InventoryItem } from '@/types';

function useRaseedOverview() {
  return useQuery({
    queryKey: ['raseed-overview'],
    queryFn: async () => {
      const [allRes, lowRes, outRes] = await Promise.all([
        fetch('/api/inventory?pageSize=6&sortBy=createdAt&sortDir=desc'),
        fetch('/api/inventory?stockStatus=low&pageSize=1'),
        fetch('/api/inventory?stockStatus=out&pageSize=1'),
      ]);
      const allBody = allRes.ok ? await allRes.json() : { items: [], total: 0 };
      const recent: InventoryItem[] = Array.isArray(allBody?.items) ? allBody.items : [];
      const total = allBody?.total ?? 0;
      const low = lowRes.ok ? (await lowRes.json())?.total ?? 0 : 0;
      const out = outRes.ok ? (await outRes.json())?.total ?? 0 : 0;
      return { total, low, out, recent };
    },
    staleTime: 30_000,
  });
}

function StockBreakdown({ ok, low, out, total, isLoading }: { ok: number; low: number; out: number; total: number; isLoading: boolean }) {
  const { t } = useT();
  const denom = total || 1;
  const rows = [
    { label: t('inventory.inStock'), count: ok, bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
    { label: t('inventory.lowStock'), count: low, bar: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400' },
    { label: t('inventory.outOfStock'), count: out, bar: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
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
    return <p className="text-sm text-gray-500 py-4 text-center">{t('inventory.noItems')}</p>;
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

const STOCK_TONE: Record<InventoryItem['stockStatus'], string> = {
  ok:  'bg-[var(--green-100)] text-[var(--green-700)]',
  low: 'bg-[var(--yellow-100)] text-[var(--yellow-700)]',
  out: 'bg-[var(--red-100)] text-[var(--red-700)]',
};

export default function RaseedOverviewPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const { t, locale } = useT();
  const { data, isLoading } = useRaseedOverview();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const total = data?.total ?? 0;
  const low = data?.low ?? 0;
  const out = data?.out ?? 0;
  const ok = Math.max(0, total - low - out);
  const recent = data?.recent ?? [];

  const base = `/${locale}/${orgSlug}/raseed`;

  const stockLabel: Record<InventoryItem['stockStatus'], string> = {
    ok: t('inventory.inStock'), low: t('inventory.lowStock'), out: t('inventory.outOfStock'),
  };

  const recentColumns: ColumnDef<InventoryItem>[] = [
    {
      key: 'name', header: t('inventory.item'),
      render: (i) => (
        <div>
          <span className="font-medium text-gray-900 text-sm">{i.name}</span>
          {i.sku && <div className="text-xs text-gray-400 font-mono">{i.sku}</div>}
        </div>
      ),
    },
    { key: 'category', header: t('col.category'), render: (i) => <span className="text-sm text-gray-600">{i.category}</span> },
    {
      key: 'stockStatus', header: t('inventory.stock'),
      render: (i) => (
        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', STOCK_TONE[i.stockStatus])}>
          {i.stockStatus === 'low' && <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />}
          {i.quantityOnHand} {i.unit} · {stockLabel[i.stockStatus]}
        </span>
      ),
    },
    { key: 'location', header: t('col.location'), render: (i) => <span className="text-sm text-gray-600">{i.location || '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.inventory')}
        description={t('overview.inventory.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push(`${base}/audits`)}>
              <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('inventory.audits')}</span>
            </Button>
            {isAdmin && (
              <SubscriptionGate>
                <Button size="sm" onClick={() => router.push(`${base}/new`)}>
                  <Plus className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('inventory.addItem')}</span>
                </Button>
              </SubscriptionGate>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Boxes className="w-[18px] h-[18px]" />}
          iconBg="var(--primary-50)" iconColor="var(--primary-700)"
          label={t('overview.totalItems')}
          value={total}
          loading={isLoading}
          onClick={() => router.push(`${base}/list`)}
        />
        <StatCard
          icon={<PackageCheck className="w-[18px] h-[18px]" />}
          iconBg="var(--green-50)" iconColor="var(--green-700)"
          label={t('inventory.inStock')}
          value={ok}
          loading={isLoading}
          onClick={() => router.push(`${base}/list?stockStatus=ok`)}
        />
        <StatCard
          icon={<AlertTriangle className="w-[18px] h-[18px]" />}
          iconBg="var(--yellow-50)" iconColor="var(--yellow-700)"
          label={t('inventory.lowStock')}
          value={low}
          loading={isLoading}
          onClick={() => router.push(`${base}/list?stockStatus=low`)}
        />
        <StatCard
          icon={<PackageX className="w-[18px] h-[18px]" />}
          iconBg="var(--red-50)" iconColor="var(--red-700)"
          label={t('inventory.outOfStock')}
          value={out}
          loading={isLoading}
          onClick={() => router.push(`${base}/list?stockStatus=out`)}
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
            emptyMessage={t('inventory.noItems')}
            onRowClick={(i) => router.push(`${base}/${i.id}`)}
            keyExtractor={(i) => i.id}
          />
        </OverviewSection>

        <OverviewSection className="lg:col-span-2" title={t('overview.byStatus')}>
          <StockBreakdown ok={ok} low={low} out={out} total={total} isLoading={isLoading} />
        </OverviewSection>
      </div>
    </div>
  );
}
