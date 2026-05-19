'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, ExportButton, LoadingSkeleton } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminGuard } from '@/hooks/ui';
import { useHarakaReport, buildReportExportUrl, type AggregateGroupBy, type AggregateBucket } from '@/hooks/haraka';

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
  const params = useParams<{ locale: string; orgSlug: string }>();

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
        title="Haraka reports"
        description="Sales rollups for the selected date range. Exports are CSV per widget."
        breadcrumb={[
          { label: 'Haraka', href: `/${params.locale}/${params.orgSlug}/haraka` },
          { label: 'Reports', href: '#' },
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
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">From</label>
          <Input
            type="date"
            value={toInput(range.from)}
            onChange={(e) => onChange({ ...range, from: startOfDay(new Date(e.target.value)) })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">To</label>
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
  const presets: Array<{ label: string; days: number }> = [
    { label: 'Today', days: 0 },
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
  ];
  return (
    <div className="flex items-center gap-1.5 ml-auto">
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
  emptyLabel = 'No data in the selected range.',
  children,
}: {
  isLoading: boolean;
  empty: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  if (isLoading) return <LoadingSkeleton rows={5} columns={1} />;
  if (empty) return <div className="text-sm text-gray-500 py-8 text-center">{emptyLabel}</div>;
  return <>{children}</>;
}

function SalesByDayWidget({ range }: WidgetProps) {
  const { data, isLoading } = useHarakaReport({ groupBy: 'day', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  const maxTotal = buckets.reduce((acc, b) => Math.max(acc, b.total), 0) || 1;
  return (
    <WidgetShell
      title="Sales by day"
      description={`Daily revenue across ${buckets.length} day${buckets.length === 1 ? '' : 's'}.`}
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
                  className="h-full bg-primary-600/80"
                  style={{ width: `${(b.total / maxTotal) * 100}%` }}
                />
              </div>
              <span className="w-20 text-right font-mono">{fmt(b.total)}</span>
              <span className="w-12 text-right text-gray-400">×{b.count}</span>
            </div>
          ))}
        </div>
        {data && <Totals data={data.totals} />}
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function TopItemsWidget({ range }: WidgetProps) {
  const { data, isLoading } = useHarakaReport({ groupBy: 'item', from: range.from, to: range.to, topN: 10 });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell
      title="Top-selling items"
      description="Top 10 items by revenue."
      range={range}
      groupBy="item"
      topN={10}
      filename="top-items.csv"
    >
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-left text-xs text-gray-500">
              <th className="py-1.5 font-medium">Item</th>
              <th className="py-1.5 font-medium text-right">Qty</th>
              <th className="py-1.5 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key} className="border-b border-border last:border-0">
                <td className="py-1.5 truncate max-w-[200px]">{b.label}</td>
                <td className="py-1.5 text-right font-mono">{b.quantity ?? 0}</td>
                <td className="py-1.5 text-right font-mono">{fmt(b.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function SalesByCashierWidget({ range }: WidgetProps) {
  const { data, isLoading } = useHarakaReport({ groupBy: 'cashier', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell
      title="Sales by cashier"
      description="Revenue and sale count per cashier."
      range={range}
      groupBy="cashier"
      filename="sales-by-cashier.csv"
    >
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        <BucketTable buckets={buckets} keyHeader="Cashier" />
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function SalesByPaymentMethodWidget({ range }: WidgetProps) {
  const { data, isLoading } = useHarakaReport({ groupBy: 'paymentMethod', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell
      title="Sales by payment method"
      description="Money in, split by tender."
      range={range}
      groupBy="paymentMethod"
      filename="sales-by-payment-method.csv"
    >
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-left text-xs text-gray-500">
              <th className="py-1.5 font-medium">Method</th>
              <th className="py-1.5 font-medium text-right">Count</th>
              <th className="py-1.5 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key} className="border-b border-border last:border-0">
                <td className="py-1.5 capitalize">{b.label}</td>
                <td className="py-1.5 text-right font-mono">{b.count}</td>
                <td className="py-1.5 text-right font-mono">{fmt(b.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </EmptyOrLoading>
    </WidgetShell>
  );
}

function SessionSummariesWidget({ range }: WidgetProps) {
  const { data, isLoading } = useHarakaReport({ groupBy: 'session', from: range.from, to: range.to });
  const buckets = data?.buckets ?? [];
  return (
    <WidgetShell
      title="Session summaries"
      description="Roll-up of sales per cash-drawer session in the range."
      range={range}
      groupBy="session"
      filename="session-summaries.csv"
    >
      <EmptyOrLoading isLoading={isLoading} empty={buckets.length === 0}>
        <BucketTable buckets={buckets} keyHeader="Session" mono />
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
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border">
        <tr className="text-left text-xs text-gray-500">
          <th className="py-1.5 font-medium">{keyHeader}</th>
          <th className="py-1.5 font-medium text-right">Sales</th>
          <th className="py-1.5 font-medium text-right">Subtotal</th>
          <th className="py-1.5 font-medium text-right">Tax</th>
          <th className="py-1.5 font-medium text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((b) => (
          <tr key={b.key} className="border-b border-border last:border-0">
            <td className={`py-1.5 truncate max-w-[180px] ${mono ? 'font-mono text-xs' : ''}`}>
              {b.label}
            </td>
            <td className="py-1.5 text-right font-mono">{b.count}</td>
            <td className="py-1.5 text-right font-mono">{fmt(b.subtotal)}</td>
            <td className="py-1.5 text-right font-mono">{fmt(b.taxAmount)}</td>
            <td className="py-1.5 text-right font-mono">{fmt(b.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Totals({ data }: { data: { transactions: number; subtotal: number; taxAmount: number; total: number } }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 pt-4 mt-3 border-t border-border text-xs">
      <span className="text-gray-500">
        Sales: <span className="font-mono text-gray-900">{data.transactions}</span>
      </span>
      <span className="text-gray-500">
        Subtotal: <span className="font-mono text-gray-900">{fmt(data.subtotal)}</span>
      </span>
      <span className="text-gray-500">
        Tax: <span className="font-mono text-gray-900">{fmt(data.taxAmount)}</span>
      </span>
      <span className="text-gray-500">
        Total: <span className="font-mono text-gray-900 font-semibold">{fmt(data.total)}</span>
      </span>
    </div>
  );
}
