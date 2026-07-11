'use client';

import { useEffect, useRef, useState } from 'react';
import { CreditCard, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInitiateCharge, useChargeStatus, useUpdateChargeStatus } from '@/hooks/haraka';
import { formatCurrency } from '@/lib/utils/format';
import type { HarakaCardTerminalConfig } from '@/types';

interface Props {
  total: number;
  config: HarakaCardTerminalConfig;
  /** Called when the cashier confirms the card payment (manually or via terminal). */
  onPaymentConfirmed: (amount: number, cardLast4?: string) => void;
  onCancel: () => void;
}

export function CardTerminalPayment({ total, config, onPaymentConfirmed, onCancel }: Props) {
  const initiateMut        = useInitiateCharge();
  const updateStatusMut    = useUpdateChargeStatus();
  const [ref, setRef]      = useState<string | null>(null);
  const [cardLast4, setCardLast4] = useState('');
  const [timedOut, setTimedOut]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isIntegrated = config.mode !== 'display';

  const { data: chargeData } = useChargeStatus(ref, isIntegrated && !!ref);
  const chargeStatus = chargeData?.charge?.status;

  // Auto-confirm when terminal approves
  useEffect(() => {
    if (chargeStatus === 'approved') {
      if (timerRef.current) clearTimeout(timerRef.current);
      onPaymentConfirmed(total, cardLast4 || undefined);
    }
  }, [chargeStatus, total, cardLast4, onPaymentConfirmed]);

  // Timeout watchdog
  useEffect(() => {
    if (!ref || chargeStatus !== 'pending') return;
    timerRef.current = setTimeout(async () => {
      setTimedOut(true);
      if (ref) {
        await updateStatusMut.mutateAsync({ ref, status: 'timeout' }).catch(() => undefined);
      }
    }, config.timeoutSeconds * 1_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [ref, chargeStatus, config.timeoutSeconds]);

  async function handleSendToTerminal() {
    const newRef = crypto.randomUUID();
    setRef(newRef);
    setTimedOut(false);
    try {
      await initiateMut.mutateAsync({ reference: newRef, amount: total, currency: config.currency });
    } catch {
      setRef(null);
    }
  }

  async function handleCancel() {
    if (ref && chargeStatus === 'pending') {
      await updateStatusMut.mutateAsync({ ref, status: 'cancelled' }).catch(() => undefined);
    }
    setRef(null);
    setTimedOut(false);
    onCancel();
  }

  async function handleRetry() {
    setRef(null);
    setTimedOut(false);
    await handleSendToTerminal();
  }

  const currency = config.currency ?? 'JOD';

  // ── Display mode ──────────────────────────────────────────────────────
  if (config.mode === 'display') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-surface-inset border border-border p-6 text-center space-y-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Enter on terminal</p>
          <p className="text-4xl font-bold font-mono tabular-nums" style={{ color: 'var(--mod-haraka)' }}>
            {formatCurrency(total, currency)}
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Card last 4 digits (optional)</label>
          <Input
            placeholder="••••"
            maxLength={4}
            value={cardLast4}
            onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="font-mono w-28"
          />
        </div>
        <Button
          className="w-full"
          style={{ background: 'var(--mod-haraka)' }}
          onClick={() => onPaymentConfirmed(total, cardLast4 || undefined)}
        >
          <CheckCircle2 className="h-4 w-4 me-2" /> Mark as paid
        </Button>
      </div>
    );
  }

  // ── Integrated modes (local_bridge / cloud / webhook) ────────────────
  // Not yet sent
  if (!ref) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-surface-inset border border-border p-6 text-center space-y-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Amount to charge</p>
          <p className="text-4xl font-bold font-mono tabular-nums" style={{ color: 'var(--mod-haraka)' }}>
            {formatCurrency(total, currency)}
          </p>
        </div>
        <Button
          className="w-full gap-2"
          style={{ background: 'var(--mod-haraka)' }}
          onClick={handleSendToTerminal}
          disabled={initiateMut.isPending}
        >
          {initiateMut.isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
            : <><CreditCard className="h-4 w-4" /> Send to terminal</>
          }
        </Button>
        <Button variant="outline" className="w-full" onClick={onCancel}>Cancel</Button>
      </div>
    );
  }

  // Waiting for approval
  if (chargeStatus === 'pending' && !timedOut) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-surface-inset border border-border p-6 text-center space-y-3">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-400" />
          <p className="text-sm font-medium text-gray-600">Waiting for terminal…</p>
          <p className="text-2xl font-bold font-mono">{formatCurrency(total, currency)}</p>
          <p className="text-xs text-gray-400">Ask the customer to tap, swipe, or insert their card</p>
        </div>
        <Button variant="outline" className="w-full text-red-500 border-red-200 hover:bg-red-50" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    );
  }

  // Approved (transient — useEffect fires onPaymentConfirmed immediately)
  if (chargeStatus === 'approved') {
    return (
      <div className="rounded-xl bg-green-50 border border-green-100 p-6 text-center space-y-2">
        <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
        <p className="text-sm font-semibold text-green-700">Payment approved!</p>
      </div>
    );
  }

  // Declined
  if (chargeStatus === 'declined') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-red-50 border border-red-100 p-5 text-center space-y-2">
          <XCircle className="h-8 w-8 mx-auto text-red-500" />
          <p className="text-sm font-semibold text-red-700">Payment declined</p>
          <p className="text-xs text-red-500">Ask the customer to try a different card or payment method</p>
        </div>
        <Button className="w-full" onClick={handleRetry} style={{ background: 'var(--mod-haraka)' }}>
          Try again
        </Button>
        <Button variant="outline" className="w-full" onClick={handleCancel}>Cancel</Button>
      </div>
    );
  }

  // Timeout / cancelled
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-5 text-center space-y-2">
        <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
        <p className="text-sm font-semibold text-amber-700">Terminal did not respond</p>
        <p className="text-xs text-amber-600">Check the terminal manually. If the payment went through, mark it as paid below.</p>
      </div>
      <Button
        className="w-full"
        style={{ background: 'var(--mod-haraka)' }}
        onClick={() => onPaymentConfirmed(total, cardLast4 || undefined)}
      >
        <CheckCircle2 className="h-4 w-4 me-2" /> Mark as paid manually
      </Button>
      <Button variant="outline" className="w-full" onClick={handleRetry}>Try again</Button>
      <Button variant="outline" className="w-full text-red-500 border-red-200" onClick={handleCancel}>Cancel</Button>
    </div>
  );
}
