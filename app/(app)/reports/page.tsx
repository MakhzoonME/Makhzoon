'use client';
import { useReports } from '@/hooks/useReports';
import { PageHeader } from '@/components/shared/PageHeader';
import { Package, PackageCheck, PackageX, Wallet, UserCheck, AlertTriangle, ShieldCheck, ClipboardList, Wrench } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function Stat({ label, value, icon: Icon, tone = 'gray' }: { label: string; value: string | number; icon: LucideIcon; tone?: 'gray' | 'indigo' | 'green' | 'amber' | 'red' }) {
  const tones: Record<string, string> = {
    gray: 'bg-gray-50 text-gray-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}

function SkeletonCard() {
  return <div className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse"><div className="h-3 bg-gray-100 rounded w-20 mb-3" /><div className="h-6 bg-gray-100 rounded w-16" /></div>;
}

export default function ReportsPage() {
  const { data, isLoading } = useReports();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Reports" description="Overview of your asset inventory and activity." />
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
      <PageHeader title="Reports" description="Overview of your asset inventory and activity." />

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Inventory</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total assets" value={summary.totalAssets} icon={Package} tone="indigo" />
          <Stat label="Active" value={summary.activeAssets} icon={PackageCheck} tone="green" />
          <Stat label="Retired" value={summary.retiredAssets} icon={PackageX} />
          <Stat label="Total value" value={formatCurrency(summary.totalValue)} icon={Wallet} tone="indigo" />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Checked out" value={summary.activeCheckouts} icon={UserCheck} tone="amber" />
          <Stat label="Overdue" value={summary.overdueCheckouts} icon={AlertTriangle} tone="red" />
          <Stat label="Expiring warranties" value={summary.warrantiesExpiringSoon} icon={ShieldCheck} tone="amber" />
          <Stat label="Open requests" value={summary.openRequests} icon={ClipboardList} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Maintenance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total cost" value={formatCurrency(summary.maintenanceCost)} icon={Wrench} tone="indigo" />
          <Stat label="Records" value={summary.maintenanceCount} icon={Wrench} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">By category</h2>
          </div>
          <div className="p-5">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">No assets yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {categories.slice(0, 8).map((c) => (
                  <li key={c.category}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{c.category}</span>
                      <span className="text-gray-500 tabular-nums">{c.count} · {formatCurrency(c.value)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(c.count / maxCatCount) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">By location</h2>
          </div>
          <div className="p-5">
            {locations.length === 0 ? (
              <p className="text-sm text-gray-500">No assets yet.</p>
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Maintenance cost by month</h2>
        </div>
        <div className="p-5">
          {maintenanceByMonth.length === 0 ? (
            <p className="text-sm text-gray-500">No maintenance records yet.</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {maintenanceByMonth.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                  <span className="text-[11px] text-gray-500 tabular-nums">{formatCurrency(m.cost)}</span>
                  <div
                    className="w-full bg-indigo-500 rounded-t-md transition-all"
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
