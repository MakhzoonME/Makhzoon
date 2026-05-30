'use client';

import { use, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, ShoppingCart, Lock } from 'lucide-react';
import { PageHeader, StatusBadge, SubscriptionGate } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useSession, useCloseSession } from '@/hooks/haraka';
import { closeSessionSchema, type CloseSessionFormData } from '@/lib/modules/haraka/sessions/schemas';
import { toast } from '@/hooks/ui';

interface Props {
  params: Promise<{ locale: string; orgSlug: string; sessionId: string }>;
}

function fmt(n: number) {
  return n.toFixed(2);
}

export default function SessionDetailPage(props: Props) {
  const params = use(props.params);
  const router = useRouter();
  const { data, isLoading } = useSession(params.sessionId);
  const closeMut = useCloseSession(params.sessionId);
  const [closing, setClosing] = useState(false);

  const form = useForm<CloseSessionFormData>({
    resolver: zodResolver(closeSessionSchema),
    defaultValues: { closingFloat: 0, notes: '' },
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
  const expectedVsCounted = Number(counted || 0) - expectedCashSoFar;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <PageHeader
        title={`Session ${session.id.slice(0, 8)}`}
        description={`Opened ${new Date(session.openedAt).toLocaleString()} by ${session.cashierName}`}
        breadcrumb={[
          { label: 'Haraka', href: `/${params.locale}/${params.orgSlug}/haraka` },
          { label: 'Sessions', href: `/${params.locale}/${params.orgSlug}/haraka/sessions` },
          { label: session.id.slice(0, 8), href: '#' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={session.status} />
            {isOpen && (
              <Button
                onClick={() => router.push(`/${params.locale}/${params.orgSlug}/haraka/register`)}
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Stat label="Opening float" value={fmt(session.openingFloat)} />
        <Stat
          label={isOpen ? 'Expected cash so far' : 'Expected cash at close'}
          value={fmt(isOpen ? expectedCashSoFar : session.expectedFloat ?? 0)}
          tone="info"
        />
        {!isOpen && (
          <>
            <Stat label="Counted at close" value={fmt(session.closingFloat ?? 0)} />
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
          </>
        )}
      </div>

      {closing && isOpen && (
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <div className="font-medium flex items-center gap-2">
            <Banknote size={16} /> Close session
          </div>
          <p className="text-sm text-gray-500">
            Count the cash in the drawer and enter it below. The variance is calculated automatically from
            this session&apos;s cash sales (and any refunds).
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCloseSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <div className="text-xs text-gray-500">Expected cash</div>
                  <div className="font-mono font-semibold">{fmt(expectedCashSoFar)}</div>
                </div>
                <FormField
                  control={form.control}
                  name="closingFloat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Counted cash (JOD) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          autoFocus
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-lg border px-3 py-2 text-sm">
                <span className="text-gray-500">Live variance: </span>
                <span
                  className={`font-mono font-semibold ${
                    expectedVsCounted === 0
                      ? 'text-gray-700'
                      : expectedVsCounted > 0
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}
                >
                  {expectedVsCounted >= 0 ? '+' : ''}
                  {fmt(expectedVsCounted)}
                </span>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ''}
                        rows={2}
                        placeholder="Any cash variance explanation, end-of-shift notes, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={closeMut.isPending}>
                  {closeMut.isPending ? 'Closing…' : 'Close session'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setClosing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
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
