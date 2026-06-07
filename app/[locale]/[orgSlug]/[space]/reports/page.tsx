'use client';
import { useReports, useOrgInfo } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { useT, useOrgSlug, useSpace, useModuleGuard } from '@/hooks/ui';
import { Package, PackageCheck, PackageX, Wallet, UserCheck, AlertTriangle, ShieldCheck, ClipboardList, Wrench } from 'lucide-react';

/* Wrap each Lucide icon to add aria-hidden — used as React.FC in Stat */
const Pkg   = () => <Package    aria-hidden className="h-4 w-4" strokeWidth={1.75} />;
const PkgOk = () => <PackageCheck aria-hidden className="h-4 w-4" strokeWidth={1.75} />;
const PkgX  = () => <PackageX  aria-hidden className="h-4 w-4" strokeWidth={1.75} />;
const Wal   = () => <Wallet     aria-hidden className="h-4 w-4" strokeWidth={1.75} />;
const UsrCk = () => <UserCheck  aria-hidden className="h-4 w-4" strokeWidth={1.75} />;
const Alert = () => <AlertTriangle aria-hidden className="h-4 w-4" strokeWidth={1.75} />;
const Shld  = () => <ShieldCheck aria-hidden className="h-4 w-4" strokeWidth={1.75} />;
const Clip  = () => <ClipboardList aria-hidden className="h-4 w-4" strokeWidth={1.75} />;
const Wrch  = () => <Wrench     aria-hidden className="h-4 w-4" strokeWidth={1.75} />;


function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const ACCENTS: Record<string, string> = {
  gray:   'var(--gray-400)',
  indigo: 'var(--primary-500)',
  green:  'var(--green-600)',
  amber:  'var(--amber-500)',
  red:    'var(--red-600)',
};

function Stat({ label, value, icon: Icon, tone = 'gray' }: { label: string; value: string | number; icon: React.FC; tone?: 'gray' | 'indigo' | 'green' | 'amber' | 'red' }) {
  const tones: Record<string, string> = {
    gray:   'bg-surface-page text-gray-700',
    indigo: 'bg-[var(--primary-50)] text-[var(--primary-700)]',
    green:  'bg-[var(--green-50)] text-[var(--green-700)]',
    amber:  'bg-[var(--yellow-50)] text-[var(--yellow-700)]',
    red:    'bg-[var(--red-50)] text-[var(--red-700)]',
  };
  return (
    <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
      <div className="h-0.5 w-full" style={{ background: ACCENTS[tone] }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
            <Icon />
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="bg-surface-card rounded-xl border border-border p-5 h-24 animate-pulse"><div className="h-3 bg-surface-page rounded w-20 mb-3" /><div className="h-6 bg-surface-page rounded w-16" /></div>;
}

export default function ReportsPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'reports', moduleKey: 'reports' });
  const { t } = useT();
  if (!isAllowed) return null;
  const orgSlug = useOrgSlug();
  const space   = useSpace();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = useReports();

  const breadcrumb = [
    { label: orgInfo?.name ?? orgSlug },
    { label: space },
    { label: t('nav.reports') },
  ];

  if (isLoading) {
    return (
      <div>
        <PageHeader title={t('nav.reports')} description={t('reports.description')} breadcrumb={breadcrumb} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { summary, categories, locations, maintenanceByMonth } = data;
  const maxCatCount = Math.max(1, ...categories.map((c) => c.count));
  const maxMonthCost = Math.max(1, ...maintenanceByMonth.map((m) => m.cost));

  return (
    <div>
      <PageHeader title={t('nav.reports')} description={t('reports.description')} />

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('reports.inventory')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={t('reports.totalAssets')} value={summary.totalAssets} icon={Pkg} tone="indigo" />
          <Stat label={t('reports.active')} value={summary.activeAssets} icon={PkgOk} tone="green" />
          <Stat label={t('reports.retired')} value={summary.retiredAssets} icon={PkgX} />
          <Stat label={t('reports.totalValue')} value={formatCurrency(summary.totalValue)} icon={Wal} tone="indigo" />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('reports.activity')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={t('reports.checkedOut')} value={summary.activeCheckouts} icon={UsrCk} tone="amber" />
          <Stat label={t('reports.overdue')} value={summary.overdueCheckouts} icon={Alert} tone="red" />
          <Stat label={t('reports.expiringWarranties')} value={summary.warrantiesExpiringSoon} icon={Shld} tone="amber" />
          <Stat label={t('reports.openRequests')} value={summary.openRequests} icon={Clip} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('reports.maintenance')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={t('reports.totalCost')} value={formatCurrency(summary.maintenanceCost)} icon={Wrch} tone="indigo" />
          <Stat label={t('reports.records')} value={summary.maintenanceCount} icon={Wrch} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-gray-900">{t('reports.byCategory')}</h2>
          </div>
          <div className="p-5">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">{t('reports.noAssets')}</p>
            ) : (
              <ul className="space-y-2.5">
                {categories.slice(0, 8).map((c) => (
                  <li key={c.category}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{c.category}</span>
                      <span className="text-gray-500 tabular-nums">{c.count} · {formatCurrency(c.value)}</span>
                    </div>
                    <div className="h-2 bg-surface-page rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(c.count / maxCatCount) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-gray-900">{t('reports.byLocation')}</h2>
          </div>
          <div className="p-5">
            {locations.length === 0 ? (
              <p className="text-sm text-gray-500">{t('reports.noAssets')}</p>
            ) : (
              <ul className="space-y-1.5">
                {locations.slice(0, 8).map((l) => (
                  <li key={l.location} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{l.location}</span>
                    <span className="text-gray-500 tabular-nums text-xs">{l.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-gray-900">{t('reports.maintenanceCost')}</h2>
        </div>
        <div className="p-5">
          {maintenanceByMonth.length === 0 ? (
            <p className="text-sm text-gray-500">{t('reports.noMaintenance')}</p>
          ) : (
            <div className="space-y-3">
              {maintenanceByMonth.map((m, i) => {
                const isLatest = i === maintenanceByMonth.length - 1;
                const pct = maxMonthCost === 0 ? 0 : Math.max(2, Math.round((m.cost / maxMonthCost) * 100));
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="w-12 text-xs text-gray-500 shrink-0 text-end">{m.month}</span>
                    <div className="flex-1 h-6 bg-surface-page rounded overflow-hidden border border-border">
                      <div
                        className="h-full rounded transition-[width] duration-500 flex items-center justify-end pe-2"
                        style={{
                          width: `${pct}%`,
                          background: isLatest ? 'var(--primary-600)' : 'var(--primary-300)',
                        }}
                      />
                    </div>
                    <div className="w-24 text-xs tabular-nums text-right shrink-0">
                      <span className="font-medium text-gray-900">{formatCurrency(m.cost)}</span>
                      <span className="text-gray-500 ms-1">({m.count})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
