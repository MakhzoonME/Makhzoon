'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, CreditCard, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { computeChange } from '@/lib/modules/haraka/pricing/calc';
import { useT } from '@/hooks/ui';

export interface PaymentLine {
  method: 'cash' | 'card';
  amount: number;
  cardLast4?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  /** Called when the cashier confirms the payment mix covers the total. */
  onConfirm: (payments: PaymentLine[]) => void;
  loading?: boolean;
}

/**
 * Split payment UI: a list of payment rows (cash or card), each with an amount.
 * As the cashier enters amounts the dialog shows the running balance and
 * estimated change. Confirms once balance reaches zero (or cash overpay yields
 * change).
 */
export function PaymentDialog({ open, onOpenChange, total, onConfirm, loading }: Props) {
  const { t } = useT();
  const [payments, setPayments] = useState<PaymentLine[]>([{ method: 'cash', amount: 0 }]);

  useEffect(() => {
    if (open) setPayments([{ method: 'cash', amount: total }]);
  }, [open, total]);

  const paid = payments.reduce((acc, p) => acc + (Number.isFinite(p.amount) ? p.amount : 0), 0);
  const remaining = +(total - paid).toFixed(4);
  const change = useMemo(() => computeChange(total, payments), [total, payments]);
  const canSubmit = paid + 0.0001 >= total && !payments.some((p) => p.amount < 0);

  function setRow(idx: number, patch: Partial<PaymentLine>) {
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function addRow(method: 'cash' | 'card') {
    setPayments((prev) => [...prev, { method, amount: Math.max(0, remaining) }]);
  }

  function removeRow(idx: number) {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-primary-50 text-primary-900 px-3 py-2 flex items-center justify-between">
            <span className="text-sm">Total due</span>
            <span className="font-mono font-bold text-lg">{total.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            {payments.map((p, idx) => (
              <div key={idx} className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center">
                <div className="flex items-center gap-1 px-2 py-1.5 rounded border border-border min-w-[80px] text-sm">
                  {p.method === 'cash' ? <Banknote size={14} /> : <CreditCard size={14} />}
                  {p.method === 'cash' ? 'Cash' : 'Card'}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={p.amount || ''}
                  onChange={(e) => setRow(idx, { amount: Number(e.target.value || 0) })}
                  className="font-mono"
                />
                {p.method === 'card' && (
                  <Input
                    placeholder="Last 4"
                    maxLength={4}
                    value={p.cardLast4 ?? ''}
                    onChange={(e) =>
                      setRow(idx, { cardLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })
                    }
                    className="w-20 font-mono"
                  />
                )}
                {payments.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => removeRow(idx)}
                    aria-label={t('common.remove')}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addRow('cash')} type="button">
              <Banknote size={14} className="me-1" /> Add cash
            </Button>
            <Button size="sm" variant="outline" onClick={() => addRow('card')} type="button">
              <CreditCard size={14} className="me-1" /> Add card
            </Button>
          </div>

          <div className="border-t border-border pt-2 text-sm font-mono space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-sans text-gray-500">Paid</span>
              <span>{paid.toFixed(2)}</span>
            </div>
            {remaining > 0 ? (
              <div className="flex items-center justify-between text-red-700">
                <span className="font-sans">Remaining</span>
                <span className="font-bold">{remaining.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-green-700">
                <span className="font-sans">Change to return</span>
                <span className="font-bold">{change.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const sanitized = payments
                .filter((p) => p.amount > 0)
                .map((p) => ({
                  method: p.method,
                  amount: +p.amount.toFixed(4),
                  cardLast4: p.method === 'card' ? p.cardLast4 ?? '' : undefined,
                }));
              onConfirm(sanitized as PaymentLine[]);
            }}
            disabled={!canSubmit || loading}
          >
            {loading ? 'Charging…' : 'Confirm sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
