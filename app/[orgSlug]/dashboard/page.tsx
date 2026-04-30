'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useT } from '@/hooks/useT';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, daysUntil } from '@/lib/utils/date';
import { Asset, Warranty } from '@/types';

/* ── Inline stat-card SVG icons ─────────────────────────────────── */
function ActiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M15 5.5L9 2 3 5.5v7L9 16l6-3.5v-7z" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M9 2v14M3 5.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function RetiredIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 7h12M5 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="3" y="7" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M7.5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 2L1.5 15h15L9 2z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <path d="M9 8v3.5M9 13.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function TotalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2" y="2" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <rect x="10" y="2" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <rect x="2" y="10" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <rect x="10" y="10" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [assetsRes, warrantiesRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/warranties?expiringSoon=true'),
      ]);
      const assetsBody = assetsRes.ok ? await assetsRes.json() : { items: [] };
      const warrantiesBody = warrantiesRes.ok ? await warrantiesRes.json() : [];
      const assets: Asset[] = Array.isArray(assetsBody?.items) ? assetsBody.items : [];
      const warranties: Warranty[] = Array.isArray(warrantiesBody) ? warrantiesBody : [];
      return { assets, warranties };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

type StatCardProps = {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  onClick?: () => void;
};

function StatCard({ icon, iconBg, iconColor, label, value, sub, onClick }: StatCardProps) {
  return (
    <Card
      className="transition-all duration-150"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ background: iconBg, color: iconColor }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            {value}
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonValue() {
  return <div className="h-7 w-14 bg-gray-200 rounded animate-pulse" />;
}

export default function DashboardPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { data, isLoading } = useDashboard();
  const { t } = useT();

  const activeAssets       = data?.assets.filter((a) => a.status === 'Active')  ?? [];
  const retiredAssets      = data?.assets.filter((a) => a.status === 'Retired') ?? [];
  const totalAssets        = data?.assets ?? [];
  const expiringWarranties = data?.warranties ?? [];
  const recentAssets       = totalAssets.slice(0, 10);

  const assetColumns: ColumnDef<Asset>[] = [
    { key: 'name',      header: t('col.name'),     render: (a) => <span className="font-medium text-gray-900 dark:text-gray-100">{a.name}</span> },
    { key: 'category',  header: t('col.category'), render: (a) => a.category },
    { key: 'status',    header: t('col.status'),   render: (a) => <StatusBadge status={a.status} /> },
    { key: 'createdBy', header: t('col.addedBy'),  render: (a) => a.createdByName ?? a.createdByEmail ?? a.createdBy },
    { key: 'createdAt', header: t('col.date'),     render: (a) => formatDate(a.createdAt) },
  ];

  const warrantyColumns: ColumnDef<Warranty>[] = [
    { key: 'assetId', header: t('col.asset'),     render: (w) => w.assetName ?? w.assetId },
    { key: 'vendor',  header: t('col.vendor'),    render: (w) => w.vendor },
    { key: 'endDate', header: t('col.expiry'),    render: (w) => <span className="text-red-600 font-medium">{formatDate(w.endDate)}</span> },
    {
      key: 'days', header: t('col.remaining'), render: (w) => {
        const d = daysUntil(w.endDate);
        return (
          <span className={`font-semibold tabular-nums ${d < 7 ? 'text-red-600' : 'text-yellow-700'}`}>
            {d < 0 ? `Expired ${Math.abs(d)}d ago` : `${d}d`}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title={t('nav.dashboard')} />

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<TotalIcon />}
          iconBg="var(--primary-50)"
          iconColor="var(--primary-600)"
          label={t('dashboard.totalAssets')}
          value={isLoading ? <SkeletonValue /> : <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{totalAssets.length}</p>}
          onClick={() => router.push(`/${orgSlug}/assets`)}
        />
        <StatCard
          icon={<ActiveIcon />}
          iconBg="var(--green-50)"
          iconColor="var(--green-600)"
          label={t('dashboard.active')}
          value={isLoading ? <SkeletonValue /> : <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{activeAssets.length}</p>}
          sub={!isLoading && totalAssets.length > 0 ? `${Math.round((activeAssets.length / totalAssets.length) * 100)}${t('dashboard.percentOfTotal')}` : undefined}
          onClick={() => router.push(`/${orgSlug}/assets?status=Active`)}
        />
        <StatCard
          icon={<RetiredIcon />}
          iconBg="var(--gray-100)"
          iconColor="var(--gray-500)"
          label={t('dashboard.retired')}
          value={isLoading ? <SkeletonValue /> : <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{retiredAssets.length}</p>}
          onClick={() => router.push(`/${orgSlug}/assets?status=Retired`)}
        />
        <StatCard
          icon={<WarningIcon />}
          iconBg="var(--yellow-50)"
          iconColor="var(--yellow-600)"
          label={t('dashboard.warrantiesExpiring')}
          value={
            isLoading ? <SkeletonValue /> : (
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {expiringWarranties.length}
              </p>
            )
          }
          onClick={() => router.push(`/${orgSlug}/warranties?expiring=30`)}
        />
      </div>

      {/* ── Data tables ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.recentAssets')}</h2>
              <button
                onClick={() => router.push(`/${orgSlug}/assets`)}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                {t('dashboard.viewAll')}
              </button>
            </div>
            <DataTable
              data={recentAssets}
              columns={assetColumns}
              isLoading={isLoading}
              emptyMessage={t('assets.noAssets')}
              onRowClick={(a) => router.push(`/${orgSlug}/assets/${a.id}`)}
              keyExtractor={(a) => a.id}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.expiringWarranties')}</h2>
              <button
                onClick={() => router.push(`/${orgSlug}/warranties`)}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                {t('dashboard.viewAll')}
              </button>
            </div>
            <DataTable
              data={expiringWarranties}
              columns={warrantyColumns}
              isLoading={isLoading}
              emptyMessage={t('dashboard.noWarranties')}
              keyExtractor={(w) => w.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
