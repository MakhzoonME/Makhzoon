'use client';
import { useVertical } from '@/components/vertical/VerticalProvider';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, ExportButton, LoadingSkeleton } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminGuard, useT, useModuleGuard } from '@/hooks/ui';
import {
  useHarakaReport, type AggregateBucket,
  useHarakaAnalytics, buildAnalyticsExportUrl, type AnalyticsModuleKey,
} from '@/hooks/haraka';
import { useOrgInfo, useActiveHarakaModules } from '@/hooks/org';
import type { MessageKey } from '@/locales/messages';

interface DateRange {
  from: Date;
  to: Date;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}
function fmt(n: number) {
  return n.toFixed(2);
}
function toInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Modules beyond the always-on POS base — each only shows a card when the
// org's subscription has that Haraka sub-module active.
const MODULE_LABEL_KEYS: Record<Exclude<AnalyticsModuleKey, 'pos'>, MessageKey> = {
  orders: 'nav.harakaOrders',
  serviceJobs: 'nav.harakaServiceJobs',
  retainers: 'nav.harakaRetainers',
  appointments: 'nav.harakaAppointments',
};
const MODULE_HARAKA_KEY: Record<Exclude<AnalyticsModuleKey, 'pos'>, string> = {
  orders: 'orders',
  serviceJobs: 'services',
  retainers: 'retainers',
  appointments: 'appointments',
};

export function AnalyticsPage() {
  const { featureKey, permModule, basePath, navLabelKey } = useVertical();
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey, moduleKey: permModule });
  // Resolve against the ACTIVE vertical's namespace.
  const { isAllowed } = useAdminGuard(`${permModule}.analyticsView`);
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const activeHarakaModules = useActiveHarakaModules();

  const [range, setRange] = useState<DateRange>(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: startOfDay(from), to: endOfDay(to) };
  });

  const exportUrl = useMemo(
    () => buildAnalyticsExportUrl({ from: range.from, to: range.to }),
    [range.from, range.to],
  );

  if (!featureAllowed || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.harakaReports')}
        description={t('reports.subtitle')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t(navLabelKey), href: basePath },
          { label: t('nav.harakaReports') },
        ]}
        actions={
          <ExportButton
            filename="haraka-analytics"
            ext="csv"
            getUrl={() => exportUrl}
            showFiltered={false}
          />
        }
      />

      <DateRangePicker range={range} onChange={setRange} />

      <OverviewSection range={range} activeHarakaModules={activeHarakaModules} />

      {/* Existing POS-specific detail — unchanged, no per-widget export (whole-page export above covers it) */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <SalesByDayWidget range={range} />
        <TopItemsWidget range={range} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesByPaymentMethodWidget range={range} />
        <SessionSummariesWidget range={range} />
      </div>
    </div>
  );
}

/* ── Overview: combined KPIs + revenue-by-day + per-module cards ────── */
function OverviewSection({
  range,
  activeHarakaModules,
}: {
  range: DateRange;
  activeHarakaModules: string[];
}) {
  const { colorVar } = useVertical();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const currency = orgInfo?.currency ?? 'JOD';
  const { data, isLoading } = useHarakaAnalytics({ from: range.from, to: range.to });

  const buckets = data?.byDay ?? [];
  const maxRevenue = buckets.reduce((acc, b) => Math.max(acc, b.revenue), 0) || 1;

  const moduleKeys = (Object.keys(MODULE_LABEL_KEYS) as Exclude<AnalyticsModuleKey, 'pos'>[]).filter(
    (k) => activeHarakaModules.includes(MODULE_HARAKA_KEY[k]),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label={t('reports.totalSales')}
          value={isLoading ? '—' : String(data?.totals.count ?? 0)}
        />
        <StatCard
          label={t('reports.totalRevenue')}
          value={isLoading ? '—' : `${fmt(data?.totals.revenue ?? 0)} ${currency}`}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900">{t('reports.revenueByDay')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('reports.revenueByDayDesc')}</p>
          </div>
          {isLoading ? (
            <LoadingSkeleton rows={5} columns={1} />
          ) : buckets.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">{t('reports.noData')}</div>
          ) : (
            <div className="flex items-end gap-2 h-40 overflow-x-auto">
              {buckets.map((b, i) => {
                const pct = (b.revenue / maxRevenue) * 100;
                const isLast = i === buckets.length - 1;
                return (
                  <div key={b.date} className="flex-1 flex flex-col items-center gap-1 min-w-[2rem]">
                    <span className="text-[10px] font-semibold text-gray-500 font-mono">{fmt(b.revenue)}</span>
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        background: isLast ? colorVar : `color-mix(in srgb, ${colorVar} 45%, var(--surface-inset))`,
                      }}
                    />
                    <span className="text-[10px] text-gray-400 truncate w-full text-center">{b.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <ModuleCard
          label={t('nav.harakaPos')}
          count={data?.modules.pos.count}
          revenue={data?.modules.pos.revenue}
          currency={currency}
          isLoading={isLoading}
        />
        {moduleKeys.map((k) => (
          <ModuleCard
            key={k}
            label={t(MODULE_LABEL_KEYS[k])}
            count={data?.modules[k].count}
            revenue={data?.modules[k].revenue}
            currency={currency}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-semibold text-gray-900 mt-1 font-mono">{value}</div>
      </CardContent>
    </Card>
  );
}

function ModuleCard({
  label,
  count,
  revenue,
  currency,
  isLoading,
}: {
  label: string;
  count?: number;
  revenue?: number;
  currency: string;
  isLoading: boolean;
}) {
  const { t } = useT();
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium text-gray-500 truncate">{label}</div>
        <div className="text-lg font-semibold text-gray-900 mt-1 font-mono">
          {isLoading ? '—' : (count ?? 0).toLocaleString()}
        </div>
        <div className="text-[11px] text-gray-400">{t('reports.sales')}</div>
        <div className="text-sm font-mono text-gray-700 mt-2">
          {isLoading ? '—' : `${fmt(revenue ?? 0)} ${currency}`}
        </div>
        <div className="text-[11px] text-gray-400">{t('col.total')}</div>
      </CardContent>
    </Card>
  );
}

function DateRangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const { t } = useT();
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">{t('reports.from')}</label>
          <Input
            type="date"
            value={toInput(range.from)}
            onChange={(e) => onChange({ ...range, from: startOfDay(new Date(e.target.value)) })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{t('reports.to')}</label>
          <Input
            type="date"
            value={toInput(range.to)}
            onChange={(e) => onChange({ ...range, to: endOfDay(new Date(e.target.value)) })}
          />
        </div>
        <PresetButtons onChange={onChange} />
      </CardContent>
    </Card>
  );
}

function PresetButtons({ onChange }: { onChange: (r: DateRange) => void }) {
  const { t } = useT();
  const presets: Array<{ label: string; days: number }> = [
    { label: t('reports.today'), days: 0 },
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
  ];
  return (
    <div className="flex items-center gap-1.5 ms-auto">
      {presets.map((p) => (
        <button
          key={p.label}
          type="button"
          className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-surface-page transition-colors"
          onClick={() => {
            const to = new Date();
            const from = p.days === 0 ? startOfDay(to) : new Date(to.getTime() - p.days * 24 * 60 * 60 * 1000);
            onChange({ from: startOfDay(from), to: endOfDay(to) });
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

interface WidgetProps {
  range: DateRange;
}

function WidgetShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyOrLoading({
  isLoading,
  empty,
  emptyLabel,
  children,
}: {
  isLoading: boolean;
  empty: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  const { t } = useT();
  if (isLoading) return <LoadingSkeleton rows={5} columns={1} />;
  if (empty) return <div className="text-sm text-gray-500 py-8 text-center">{emptyLabel ?? t('reports.noData')}</div>;
  return <>{children}</>;
}

function SalesByDayWidget({ range }: WidgetProps) {
  const { colorVar } = useVertical();
  const { t } = useT();
  const { data, isLoading } = useHarakaReport({ groupBy: 'day', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  const maxTotal = buckets.reduce((acc, b) => Math.max(acc, b.total), 0) || 1;
  return (
    <WidgetShell
      title={t('reports.salesByDay')}
      description={t('reports.salesByDayDesc').replace('{count}', String(buckets.length))}
    >
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        {/* Vertical bar chart matching the design */}
        <div className="flex items-end gap-2 h-44 mb-3">
          {buckets.map((b, i) => {
            const pct = (b.total / maxTotal) * 100;
            const isLast = i === buckets.length - 1;
            return (
              <div key={b.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-[10px] font-semibold text-gray-500 font-mono">{fmt(b.total)}</span>
                <div className="w-full rounded-t-md" style={{
                  height: `${Math.max(pct, 4)}%`,
                  background: isLast ? colorVar : `color-mix(in srgb, ${colorVar} 45%, var(--surface-inset))`,
                }} />
                <span className="text-[10px] text-gray-400 truncate w-full text-center">{b.key.slice(5)}</span>
              </div>
            );
          })}
        </div>
        {data && <Totals data={data.totals} />}
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function TopItemsWidget({ range }: WidgetProps) {
  const { t } = useT();
  const { data, isLoading } = useHarakaReport({ groupBy: 'item', from: range.from, to: range.to, topN: 10 });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell title={t('reports.topItems')} description={t('reports.topItemsDesc')}>
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-start text-xs text-gray-500">
                <th className="py-1.5 font-medium">{t('reports.item')}</th>
                <th className="py-1.5 font-medium text-end">{t('reports.qty')}</th>
                <th className="py-1.5 font-medium text-end">{t('reports.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.key} className="border-b border-border last:border-0">
                  <td className="py-1.5 truncate max-w-[200px]">{b.label}</td>
                  <td className="py-1.5 text-end font-mono">{b.quantity ?? 0}</td>
                  <td className="py-1.5 text-end font-mono">{fmt(b.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function SalesByPaymentMethodWidget({ range }: WidgetProps) {
  const { t } = useT();
  const { data, isLoading } = useHarakaReport({ groupBy: 'paymentMethod', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell title={t('reports.salesByPayment')} description={t('reports.salesByPaymentDesc')}>
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-start text-xs text-gray-500">
                <th className="py-1.5 font-medium">{t('reports.method')}</th>
                <th className="py-1.5 font-medium text-end">{t('reports.count')}</th>
                <th className="py-1.5 font-medium text-end">{t('col.total')}</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.key} className="border-b border-border last:border-0">
                  <td className="py-1.5 capitalize">{b.label}</td>
                  <td className="py-1.5 text-end font-mono">{b.count}</td>
                  <td className="py-1.5 text-end font-mono">{fmt(b.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function SessionSummariesWidget({ range }: WidgetProps) {
  const { t } = useT();
  const { data, isLoading } = useHarakaReport({ groupBy: 'session', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell title={t('reports.sessionSummaries')} description={t('reports.sessionSummariesDesc')}>
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        <BucketTable buckets={buckets} keyHeader={t('reports.session')} mono />
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function BucketTable({
  buckets,
  keyHeader,
  mono,
}: {
  buckets: AggregateBucket[];
  keyHeader: string;
  mono?: boolean;
}) {
  const { t } = useT();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr className="text-start text-xs text-gray-500">
            <th className="py-1.5 font-medium">{keyHeader}</th>
            <th className="py-1.5 font-medium text-end">{t('reports.sales')}</th>
            <th className="py-1.5 font-medium text-end">{t('reports.subtotal')}</th>
            <th className="py-1.5 font-medium text-end">{t('reports.tax')}</th>
            <th className="py-1.5 font-medium text-end">{t('col.total')}</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key} className="border-b border-border last:border-0">
              <td className={`py-1.5 truncate max-w-[180px] ${mono ? 'font-mono text-xs' : ''}`}>
                {b.label}
              </td>
              <td className="py-1.5 text-end font-mono">{b.count}</td>
              <td className="py-1.5 text-end font-mono">{fmt(b.subtotal)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(b.taxAmount)}</td>
              <td className="py-1.5 text-end font-mono">{fmt(b.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Totals({ data }: { data: { transactions: number; subtotal: number; taxAmount: number; total: number } }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 pt-4 mt-3 border-t border-border text-xs">
      <span className="text-gray-500">
        {t('reports.sales')}: <span className="font-mono text-gray-900">{data.transactions}</span>
      </span>
      <span className="text-gray-500">
        {t('reports.subtotal')}: <span className="font-mono text-gray-900">{fmt(data.subtotal)}</span>
      </span>
      <span className="text-gray-500">
        {t('reports.tax')}: <span className="font-mono text-gray-900">{fmt(data.taxAmount)}</span>
      </span>
      <span className="text-gray-500">
        {t('col.total')}: <span className="font-mono text-gray-900 font-semibold">{fmt(data.total)}</span>
      </span>
    </div>
  );
}
