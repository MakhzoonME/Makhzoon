'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, ShoppingCart, Lock } from 'lucide-react';
import { PageHeader, StatusBadge, SubscriptionGate } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useSession, useCloseSession, useTransactions } from '@/hooks/haraka';
import { closeSessionSchema, type CloseSessionFormData } from '@/lib/modules/haraka/sessions/schemas';
import { toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';

interface Props {
  params: Promise<{ locale: string; orgSlug: string; space: string; sessionId: string }>;
}

function fmt(n: number) {
  return n.toFixed(2);
}

export default function SessionDetailPage(props: Props) {
  const params = use(props.params);
  const router = useRouter();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = useSession(params.sessionId);
  const closeMut = useCloseSession(params.sessionId);
  const [closing, setClosing] = useState(false);

  const form = useForm<CloseSessionFormData>({
    resolver: zodResolver(closeSessionSchema),
    defaultValues: { closingFloat: '' as unknown as number, notes: '' },
  });

  const counted = form.watch('closingFloat');

  async function onCloseSubmit(values: CloseSessionFormData) {
    try {
      const res = await closeMut.mutateAsync({ closingFloat: Number(values.closingFloat), notes: values.notes ?? null });
      toast.success(`Session closed. Variance: ${res.discrepancy >= 0 ? '+' : ''}${res.discrepancy.toFixed(2)}`);
      setClosing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close session');
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading…</div>;
  }
  if (!data) {
    return <div className="p-6">Session not found.</div>;
  }

  const { session, expectedCashSoFar } = data;
  const isOpen = session.status === 'open';
  // Compute session sales total from completed transactions
  const { data: txData } = useTransactions({ sessionId: params.sessionId, pageSize: 500 });
  const sessionSalesTotal = (txData?.items ?? [])
    .filter((tx) => tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.total, 0);
  const expectedVsCounted = Number(counted || 0) - expectedCashSoFar;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={`Session ${session.id.slice(0, 8)}`}
        description={`Opened ${new Date(session.openedAt).toLocaleString()} by ${session.cashierName}`}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: t('haraka.sessions'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka/sessions` },
          { label: session.id.slice(0, 8) },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={session.status} />
            {isOpen && (
              <Button
                onClick={() => router.push(`/${params.locale}/${params.orgSlug}/${params.space}/haraka/register`)}
              >
                <ShoppingCart size={14} className="me-1" /> Open register
              </Button>
            )}
            {isOpen && (
              <SubscriptionGate>
                <Button variant="outline" onClick={() => setClosing(true)}>
                  <Lock size={14} className="me-1" /> Close session
                </Button>
              </SubscriptionGate>
            )}
          </div>
        }
      />

      {/* Closed session summary banner */}
      {!isOpen && (
        <div
          className="rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
          style={{
            background: (session.discrepancy ?? 0) < 0 ? 'var(--red-50)' : 'var(--green-50)',
            borderColor: (session.discrepancy ?? 0) < 0 ? 'var(--red-100)' : 'var(--green-100)',
          }}
        >
          <div className="flex-1 space-y-0.5">
            <div
              className="text-sm font-semibold"
              style={{ color: (session.discrepancy ?? 0) < 0 ? 'var(--red-700)' : 'var(--green-700)' }}
            >
              Session closed
            </div>
            <div className="text-xs" style={{ color: (session.discrepancy ?? 0) < 0 ? 'var(--red-700)' : 'var(--green-700)', opacity: 0.8 }}>
              {new Date(session.openedAt).toLocaleString()} → {session.closedAt ? new Date(session.closedAt).toLocaleString() : '—'} · {session.cashierName}
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-xs text-gray-500">Closing float</div>
              <div className="font-mono font-bold">{fmt(session.closingFloat ?? 0)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Discrepancy</div>
              <div
                className="font-mono font-bold"
                style={{ color: (session.discrepancy ?? 0) < 0 ? 'var(--red-700)' : 'var(--green-700)' }}
              >
                {(session.discrepancy ?? 0) >= 0 ? '+' : ''}{fmt(session.discrepancy ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Stat label="Cashier" value={session.cashierName} />
        <Stat label="Opening float" value={`JOD ${fmt(session.openingFloat)}`} />
        <Stat
          label={isOpen ? 'Sales so far' : 'Total sales'}
          value={`JOD ${fmt(sessionSalesTotal)}`}
          tone="good"
        />
        {isOpen ? (
          <Stat
            label="Expected cash"
            value={fmt(expectedCashSoFar)}
            tone="info"
          />
        ) : (
          <Stat
            label="Discrepancy"
            value={`${(session.discrepancy ?? 0) >= 0 ? '+' : ''}${fmt(session.discrepancy ?? 0)}`}
            tone={
              session.discrepancy == null || session.discrepancy === 0
                ? 'default'
                : session.discrepancy > 0
                ? 'good'
                : 'bad'
            }
          />
        )}
      </div>

      {/* Transactions sub-table */}
      <SessionTransactions sessionId={params.sessionId} locale={params.locale} orgSlug={params.orgSlug} space={params.space} />

      {/* Close session — modal dialog matching the design */}
      <Dialog open={closing && isOpen} onOpenChange={(v) => !v && setClosing(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote size={18} /> Close session
            </DialogTitle>
            <p className="text-sm text-gray-500 pt-1">
              Count the cash in the drawer and enter it below.
            </p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCloseSubmit)}>
            <DialogBody className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-inset px-3 py-2 text-sm">
                  <div className="text-xs text-gray-500 mb-0.5">Opening float</div>
                  <div className="font-mono font-semibold">{fmt(session.openingFloat)}</div>
                </div>
                <div className="rounded-lg bg-surface-inset px-3 py-2 text-sm">
                  <div className="text-xs text-gray-500 mb-0.5">Expected cash sales</div>
                  <div className="font-mono font-semibold">{fmt(expectedCashSoFar)}</div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="closingFloat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash in drawer (JOD) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        autoFocus
                        {...field}
                        value={field.value === 0 && field.value !== undefined ? '' : field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live variance */}
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold"
                style={
                  expectedVsCounted === 0
                    ? { background: 'var(--green-50)', color: 'var(--green-700)' }
                    : expectedVsCounted > 0
                    ? { background: 'var(--green-50)', color: 'var(--green-700)' }
                    : { background: 'var(--red-50)', color: 'var(--red-700)' }
                }
              >
                <span>Variance</span>
                <span className="font-mono">
                  {expectedVsCounted >= 0 ? '+' : ''}{fmt(expectedVsCounted)}
                </span>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ''}
                        rows={2}
                        placeholder="Variance explanation, end-of-shift notes…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setClosing(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={closeMut.isPending}
                  style={{ background: 'var(--gray-800)', color: '#fff' }}
                >
                  {closeMut.isPending ? 'Closing…' : 'Close session'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionTransactions({ sessionId, locale, orgSlug, space }: { sessionId: string; locale: string; orgSlug: string; space: string }) {
  const router = useRouter();
  const { data, isLoading } = useTransactions({ sessionId, pageSize: 50 });
  const rows = data?.items ?? [];
  const base = `/${locale}/${orgSlug}/${space}/haraka/transactions`;

  if (isLoading) return <div className="rounded-xl border border-border p-4 text-sm text-gray-500 animate-pulse">Loading transactions…</div>;
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface-inset flex items-center justify-between">
        <span className="text-sm font-semibold">Transactions ({rows.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-inset/50">
            <tr className="text-xs text-gray-500 border-b border-border">
              <th className="text-start px-4 py-2 font-medium">Receipt</th>
              <th className="text-start px-3 py-2 font-medium">Customer</th>
              <th className="text-end px-3 py-2 font-medium">Total</th>
              <th className="text-start px-3 py-2 font-medium">Payment</th>
              <th className="text-start px-3 py-2 font-medium">Fawtara</th>
              <th className="text-start px-3 py-2 font-medium">Status</th>
              <th className="text-end px-4 py-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((tx) => (
              <tr
                key={tx.id}
                className="hover:bg-surface-hover cursor-pointer transition-colors"
                onClick={() => router.push(`${base}/${tx.id}`)}
              >
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
                    {tx.receiptNumber}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-gray-600">{tx.customerName ?? '—'}</td>
                <td className="px-3 py-2.5 text-end font-mono font-semibold">{tx.total.toFixed(2)}</td>
                <td className="px-3 py-2.5">
                  {tx.payments?.[0] && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={tx.payments[0].method === 'card'
                        ? { background: 'var(--blue-100)', color: 'var(--blue-700)' }
                        : { background: 'var(--green-100)', color: 'var(--green-700)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {tx.payments[0].method === 'card' ? 'Card' : 'Cash'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {tx.fawtara ? (
                    tx.fawtara.status === 'submitted' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--green-100)] text-[var(--green-700)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" /> Submitted
                      </span>
                    ) : tx.fawtara.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--red-100)] text-[var(--red-700)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" /> Failed
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{tx.fawtara.status}</span>
                    )
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={tx.status === 'completed'
                      ? { background: 'var(--green-100)', color: 'var(--green-700)' }
                      : tx.status === 'voided'
                      ? { background: 'var(--surface-inset)', color: 'var(--text-secondary)' }
                      : { background: 'var(--yellow-100)', color: 'var(--yellow-700)' }}
                  >
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-end font-mono text-xs text-gray-500">
                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'info' | 'good' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-green-700'
      : tone === 'bad'
      ? 'text-red-700'
      : tone === 'info'
      ? 'text-primary-700'
      : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="rounded-lg border border-border bg-surface-page px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-mono font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
