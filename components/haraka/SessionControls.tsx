'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Banknote, Lock, Plus } from 'lucide-react';
import { SubscriptionGate } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import {
  openSessionSchema,
  closeSessionSchema,
  type OpenSessionFormData,
  type CloseSessionFormData,
} from '@/lib/modules/haraka/sessions/schemas';
import { useCurrentSession, useSession, useOpenSession, useCloseSession } from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/date';

function fmt(n: number) {
  return n.toFixed(2);
}

/**
 * The session control center for the Haraka Sessions page. Owns the open/close
 * lifecycle inline so cashiers never get bounced between pages:
 *   • no open session → a clear empty state with an "Open session" CTA
 *   • open session    → a banner to jump into the register, plus inline close
 */
export function SessionControls({ base }: { base: string }) {
  const router = useRouter();
  const { t } = useT();
  const { data, isLoading } = useCurrentSession();
  const session = data?.session ?? null;

  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface-card p-5 space-y-2 animate-pulse">
        <div className="h-4 w-40 bg-surface-inset rounded" />
        <div className="h-3 w-64 bg-surface-inset rounded" />
      </div>
    );
  }

  return (
    <>
      {session ? (
        /* ── Active session banner ─────────────────────────────────────── */
        <div className="rounded-xl border border-green-100 bg-green-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
              <span className="text-sm font-semibold text-green-700">{t('haraka.activeSession')}</span>
            </div>
            <p className="text-sm text-gray-600">
              {t('haraka.openedBy').replace('{name}', session.cashierName)}
              {' · '}{formatDate(session.openedAt)}
              {' · '}{formatCurrency(session.openingFloat)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SubscriptionGate>
              <Button variant="outline" size="sm" onClick={() => setCloseDialog(true)}>
                <Lock size={14} className="me-1" /> {t('register.closeSession')}
              </Button>
            </SubscriptionGate>
            <Button
              size="sm"
              style={{ background: 'var(--mod-haraka)' }}
              onClick={() => router.push(`${base}/register`)}
            >
              {t('haraka.openRegister')} <ArrowRight className="h-4 w-4 ms-1" />
            </Button>
          </div>
        </div>
      ) : (
        /* ── No active session ─────────────────────────────────────────── */
        <div className="rounded-xl border border-border bg-surface-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">{t('haraka.noOpenSession')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t('haraka.openSessionDesc')}</p>
          </div>
          <SubscriptionGate>
            <Button size="sm" style={{ background: 'var(--mod-haraka)' }} onClick={() => setOpenDialog(true)}>
              <Plus className="h-4 w-4 me-1" /> {t('haraka.openNewSession')}
            </Button>
          </SubscriptionGate>
        </div>
      )}

      <OpenSessionDialog open={openDialog} onOpenChange={setOpenDialog} />
      {session && (
        <CloseSessionDialog
          sessionId={session.id}
          open={closeDialog}
          onOpenChange={setCloseDialog}
        />
      )}
    </>
  );
}

/* ── Open session dialog ───────────────────────────────────────────────── */
function OpenSessionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT();
  const openMut = useOpenSession();
  const form = useForm<OpenSessionFormData>({
    resolver: zodResolver(openSessionSchema),
    defaultValues: { openingFloat: '' as unknown as number },
  });

  async function onSubmit(values: OpenSessionFormData) {
    try {
      await openMut.mutateAsync(values);
      toast.success(t('haraka.openNewSession'));
      form.reset({ openingFloat: '' as unknown as number });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open session');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset({ openingFloat: '' as unknown as number }); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote size={18} /> {t('haraka.openNewSession')}
          </DialogTitle>
          <p className="text-sm text-gray-500 pt-1">{t('haraka.openSessionDesc')}</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              {/* Register / till — read-only; multi-till support is a future feature */}
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-700">{t('haraka.register')}</div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-sidebar px-3 py-2 text-sm text-gray-500">
                  <span className="text-base">🏪</span> {t('haraka.mainTill')}
                </div>
              </div>

              <FormField
                control={form.control}
                name="openingFloat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('haraka.float')} (JOD) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        autoFocus
                        {...field}
                        value={field.value === 0 && field.value !== undefined ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={openMut.isPending} style={{ background: 'var(--mod-haraka)' }}>
                {openMut.isPending ? t('common.saving') : t('haraka.openNewSession')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Close session dialog ──────────────────────────────────────────────── */
function CloseSessionDialog({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useT();
  const { data } = useSession(sessionId);
  const closeMut = useCloseSession(sessionId);
  const form = useForm<CloseSessionFormData>({
    resolver: zodResolver(closeSessionSchema),
    defaultValues: { closingFloat: '' as unknown as number, notes: '' },
  });

  const openingFloat = data?.session.openingFloat ?? 0;
  const expectedCashSoFar = data?.expectedCashSoFar ?? 0;
  const counted = form.watch('closingFloat');
  const expectedVsCounted = Number(counted || 0) - expectedCashSoFar;

  async function onSubmit(values: CloseSessionFormData) {
    try {
      const res = await closeMut.mutateAsync({ closingFloat: Number(values.closingFloat), notes: values.notes ?? null });
      toast.success(`Session closed. Variance: ${res.discrepancy >= 0 ? '+' : ''}${res.discrepancy.toFixed(2)}`);
      form.reset({ closingFloat: '' as unknown as number, notes: '' });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close session');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset({ closingFloat: '' as unknown as number, notes: '' }); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote size={18} /> {t('register.closeSession')}
          </DialogTitle>
          <p className="text-sm text-gray-500 pt-1">Count the cash in the drawer and enter it below.</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-inset px-3 py-2 text-sm">
                  <div className="text-xs text-gray-500 mb-0.5">Opening float</div>
                  <div className="font-mono font-semibold">{fmt(openingFloat)}</div>
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
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
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
                  expectedVsCounted >= 0
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={closeMut.isPending}
                style={{ background: 'var(--gray-800)', color: '#fff' }}
              >
                {closeMut.isPending ? 'Closing…' : t('register.closeSession')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
