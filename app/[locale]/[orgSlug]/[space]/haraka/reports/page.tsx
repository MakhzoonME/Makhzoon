'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, ExportButton, LoadingSkeleton } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminGuard, useT } from '@/hooks/ui';
import { useHarakaReport, buildReportExportUrl, type AggregateGroupBy, type AggregateBucket } from '@/hooks/haraka';
import { useOrgInfo } from '@/hooks/org';

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

export default function HarakaReportsPage() {
  const { isAllowed } = useAdminGuard('pos.view_reports');
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();

  const [range, setRange] = useState<DateRange>(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: startOfDay(from), to: endOfDay(to) };
  });

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('nav.harakaReports')}
        description={t('reports.subtitle')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: t('nav.harakaReports') },
        ]}
      />

      <DateRangePicker range={range} onChange={setRange} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesByDayWidget range={range} />
        <TopItemsWidget range={range} />
        <SalesByCashierWidget range={range} />
        <SalesByPaymentMethodWidget range={range} />
        <SessionSummariesWidget range={range} />
      </div>
    </div>
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
  range,
  groupBy,
  topN,
  filename,
  children,
}: {
  title: string;
  description: string;
  range: DateRange;
  groupBy: AggregateGroupBy;
  topN?: number;
  filename: string;
  children: React.ReactNode;
}) {
  const exportUrl = useMemo(
    () => buildReportExportUrl({ groupBy, from: range.from, to: range.to, topN }),
    [groupBy, range.from, range.to, topN],
  );
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
          <ExportButton exportUrl={exportUrl} filename={filename} />
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
  const { t } = useT();
  const { data, isLoading } = useHarakaReport({ groupBy: 'day', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  const maxTotal = buckets.reduce((acc, b) => Math.max(acc, b.total), 0) || 1;
  return (
    <WidgetShell
      title={t('reports.salesByDay')}
      description={t('reports.salesByDayDesc').replace('{count}', String(buckets.length))}
      range={range}
      groupBy="day"
      filename="sales-by-day.csv"
    >
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        <div className="space-y-1.5">
          {buckets.map((b) => (
            <div key={b.key} className="flex items-center gap-3 text-xs">
              <span className="w-20 font-mono text-gray-600">{b.key}</span>
              <div className="flex-1 h-5 bg-surface-page rounded overflow-hidden">
                <div
                  style={{ width: `${(b.total / maxTotal) * 100}%`, height: '100%', background: 'var(--mod-haraka)', opacity: 0.8 }}
                />
              </div>
              <span className="w-20 text-end font-mono">{fmt(b.total)}</span>
              <span className="w-12 text-end text-gray-400">×{b.count}</span>
            </div>
          ))}
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
    <WidgetShell
      title={t('reports.topItems')}
      description={t('reports.topItemsDesc')}
      range={range}
      groupBy="item"
      topN={10}
      filename="top-items.csv"
    >
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
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
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function SalesByCashierWidget({ range }: WidgetProps) {
  const { t } = useT();
  const { data, isLoading } = useHarakaReport({ groupBy: 'cashier', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell
      title={t('reports.salesByCashier')}
      description={t('reports.salesByCashierDesc')}
      range={range}
      groupBy="cashier"
      filename="sales-by-cashier.csv"
    >
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        <BucketTable buckets={buckets} keyHeader={t('reports.cashier')} />
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function SalesByPaymentMethodWidget({ range }: WidgetProps) {
  const { t } = useT();
  const { data, isLoading } = useHarakaReport({ groupBy: 'paymentMethod', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell
      title={t('reports.salesByPayment')}
      description={t('reports.salesByPaymentDesc')}
      range={range}
      groupBy="paymentMethod"
      filename="sales-by-payment-method.csv"
    >
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
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
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function SessionSummariesWidget({ range }: WidgetProps) {
  const { t } = useT();
  const { data, isLoading } = useHarakaReport({ groupBy: 'session', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell
      title={t('reports.sessionSummaries')}
      description={t('reports.sessionSummariesDesc')}
      range={range}
      groupBy="session"
      filename="session-summaries.csv"
    >
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
