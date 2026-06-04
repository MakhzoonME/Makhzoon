'use client';

import { useState } from 'react';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { useOrderPayments, useAddOrderPayment, useRemoveOrderPayment } from '@/hooks/haraka';
import { toast } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import type { HarakaOrder } from '@/types';
import { cn } from '@/lib/utils/cn';

interface Props {
  order: HarakaOrder;
  currency?: string;
  onUpdated?: () => void;
}

const PAY_STATUS_STYLE: Record<string, string> = {
  paid:    'bg-[var(--green-100)] text-[var(--green-700)]',
  partial: 'bg-orange-100 text-orange-700',
  unpaid:  'bg-[var(--red-100)] text-[var(--red-700)]',
};

export function OrderPaymentsPanel({ order, currency = 'JOD', onUpdated }: Props) {
  const { data } = useOrderPayments(order.id);
  const addMut    = useAddOrderPayment();
  const removeMut = useRemoveOrderPayment();

  const [showForm, setShowForm] = useState(false);
  const [amount,   setAmount]   = useState('');
  const [method,   setMethod]   = useState('');
  const [note,     setNote]     = useState('');

  const payments = data?.payments ?? [];
  const remaining = order.total - order.amountPaid;

  async function handleAdd() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
    try {
      await addMut.mutateAsync({ orderId: order.id, amount: amt, paymentMethod: method || null, note: note || null });
      toast.success('Payment recorded');
      setAmount(''); setMethod(''); setNote(''); setShowForm(false);
      onUpdated?.();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  }

  async function handleRemove(paymentId: string) {
    try {
      await removeMut.mutateAsync({ orderId: order.id, paymentId });
      onUpdated?.();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to remove payment'); }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment</span>
        </div>
        <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', PAY_STATUS_STYLE[order.paymentStatus] ?? 'bg-surface-page text-gray-400')}>
          {order.paymentStatus}
        </span>
      </div>

      {/* Payment entries */}
      {payments.length > 0 && (
        <div className="space-y-1.5">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 flex items-center gap-2 text-gray-600">
                <span className="capitalize">{p.paymentMethod?.replace(/_/g, ' ') ?? 'Payment'}</span>
                {p.note && <span className="text-gray-400 text-xs">— {p.note}</span>}
              </div>
              <span className="font-mono font-medium text-gray-800">{formatCurrency(p.amount, currency)}</span>
              {order.status !== 'cancelled' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                  onClick={() => handleRemove(p.id)}
                  disabled={removeMut.isPending}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Totals summary */}
      <div className="rounded-lg bg-surface-card border border-border p-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Order total</span>
          <span className="font-mono">{formatCurrency(order.total, currency)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Paid</span>
          <span className="font-mono">{formatCurrency(order.amountPaid, currency)}</span>
        </div>
        {remaining > 0.001 && (
          <div className="flex justify-between font-semibold text-orange-600 pt-1 border-t border-border">
            <span>Balance due</span>
            <span className="font-mono">{formatCurrency(remaining, currency)}</span>
          </div>
        )}
        {remaining <= 0.001 && order.amountPaid > 0 && (
          <div className="flex justify-between font-semibold text-green-600 pt-1 border-t border-border">
            <span>✓ Fully paid</span>
          </div>
        )}
      </div>

      {/* Add payment form */}
      {order.status !== 'cancelled' && (
        <>
          {!showForm ? (
            <button
              type="button"
              onClick={() => { setShowForm(true); setAmount(remaining > 0 ? remaining.toFixed(3) : ''); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 py-1 rounded-lg border border-dashed border-primary-200 hover:border-primary-400 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> Add payment entry
            </button>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Amount *</label>
                  <Input
                    type="number" min="0" step="0.001"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.000" className="font-mono text-sm h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Method</label>
                  <ConfigSelect listKey="order_payment_method" value={method} onValueChange={setMethod} placeholder="Select…" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Note (optional)</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Change returned 5 JOD" className="text-sm h-8" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                <Button size="sm" onClick={handleAdd} disabled={addMut.isPending} className="flex-1" style={{ background: 'var(--mod-haraka)' }}>
                  {addMut.isPending ? 'Saving…' : 'Save payment'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
