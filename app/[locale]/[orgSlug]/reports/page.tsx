'use client';
import { useReports } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { useT } from '@/hooks/ui';
import { Package, PackageCheck, PackageX, Wallet, UserCheck, AlertTriangle, ShieldCheck, ClipboardList, Wrench } from 'lucide-react';


function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function Stat({ label, value, icon: Icon, tone = 'gray' }: { label: string; value: string | number; icon: React.FC; tone?: 'gray' | 'indigo' | 'green' | 'amber' | 'red' }) {
  const tones: Record<string, string> = {
    gray:   'bg-surface-page text-gray-700',
    indigo: 'bg-[var(--primary-50)] text-[var(--primary-700)]',
    green:  'bg-[var(--green-50)] text-[var(--green-700)]',
    amber:  'bg-[var(--yellow-50)] text-[var(--yellow-700)]',
    red:    'bg-[var(--red-50)] text-[var(--red-700)]',
  };
  return (
    <div className="bg-surface-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}

function SkeletonCard() {
  return <div className="bg-surface-card rounded-xl border border-border p-5 h-24 animate-pulse"><div className="h-3 bg-surface-page rounded w-20 mb-3" /><div className="h-6 bg-surface-page rounded w-16" /></div>;
}

export default function ReportsPage() {
  const { t } = useT();
  const { data, isLoading } = useReports();

  if (isLoading) {
    return (
      <div>
        <PageHeader title={t('nav.reports')} description={t('reports.description')} />
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
          <Stat label={t('reports.totalAssets')} value={summary.totalAssets} icon={Package} tone="indigo" />
          <Stat label={t('reports.active')} value={summary.activeAssets} icon={PackageCheck} tone="green" />
          <Stat label={t('reports.retired')} value={summary.retiredAssets} icon={PackageX} />
          <Stat label={t('reports.totalValue')} value={formatCurrency(summary.totalValue)} icon={Wallet} tone="indigo" />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('reports.activity')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={t('reports.checkedOut')} value={summary.activeCheckouts} icon={UserCheck} tone="amber" />
          <Stat label={t('reports.overdue')} value={summary.overdueCheckouts} icon={AlertTriangle} tone="red" />
          <Stat label={t('reports.expiringWarranties')} value={summary.warrantiesExpiringSoon} icon={ShieldCheck} tone="amber" />
          <Stat label={t('reports.openRequests')} value={summary.openRequests} icon={ClipboardList} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t('reports.maintenance')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={t('reports.totalCost')} value={formatCurrency(summary.maintenanceCost)} icon={Wrench} tone="indigo" />
          <Stat label={t('reports.records')} value={summary.maintenanceCount} icon={Wrench} />
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
            <div className="flex items-end gap-3 h-40">
              {maintenanceByMonth.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                  <span className="text-[11px] text-gray-500 tabular-nums">{formatCurrency(m.cost)}</span>
                  <div
                    className="w-full bg-primary-500 rounded-t-md transition-all"
                    style={{ height: `${Math.max(4, (m.cost / maxMonthCost) * 100)}%` }}
                    title={`${m.count} record${m.count === 1 ? '' : 's'}`}
                  />
                  <span className="text-[11px] text-gray-500">{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
