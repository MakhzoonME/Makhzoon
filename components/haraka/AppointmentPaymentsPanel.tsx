'use client';

import { useState } from 'react';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import {
  useAppointmentPayments,
  useAddAppointmentPayment,
  useRemoveAppointmentPayment,
  useUpdateAppointment,
} from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import type { HarakaAppointment } from '@/types';
import { cn } from '@/lib/utils/cn';

interface Props {
  appointment: HarakaAppointment;
  currency?: string;
  readOnly?: boolean;
  /** Separate from `readOnly` (which gates payment entries) — discount edits
   *  require `appointmentsUpdate`, not `appointmentsAddPayment`. */
  canEditDiscount?: boolean;
}

const PAY_STATUS_STYLE: Record<string, string> = {
  paid:    'bg-[var(--green-100)] text-[var(--green-700)]',
  partial: 'bg-orange-100 text-orange-700',
  unpaid:  'bg-[var(--red-100)] text-[var(--red-700)]',
};

interface SplitRow { id: string; method: string; value: string }

function makeSplitRows(): SplitRow[] {
  return [
    { id: crypto.randomUUID(), method: '', value: '' },
    { id: crypto.randomUUID(), method: '', value: '' },
  ];
}

/** Split-payment ledger for one appointment. Mirrors ServiceJobPaymentsPanel —
 *  appointments reuse the shared `payment_method` managed list (also used by
 *  Orders, Service Jobs, and the POS register) so an org configures its
 *  payment methods in one place. */
export function AppointmentPaymentsPanel({ appointment, currency = 'JOD', readOnly, canEditDiscount }: Props) {
  const { data } = useAppointmentPayments(appointment.id);
  const addMut = useAddAppointmentPayment();
  const removeMut = useRemoveAppointmentPayment();
  const updateMut = useUpdateAppointment();
  const { t } = useT();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  const [splitMode, setSplitMode] = useState(false);
  const [splitBasis, setSplitBasis] = useState<'percentage' | 'amount'>('percentage');
  const [splitRows, setSplitRows] = useState<SplitRow[]>(() => makeSplitRows());

  const payments = data?.payments ?? [];
  const remaining = appointment.total - appointment.amountPaid;
  const terminal = appointment.status === 'cancelled' || appointment.status === 'no_show';

  const totalAmt = parseFloat(amount) || 0;
  const splitBasisSum = splitRows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
  const splitTargetSum = splitBasis === 'percentage' ? 100 : totalAmt;
  const splitValid =
    totalAmt > 0 &&
    Math.abs(splitBasisSum - splitTargetSum) < 0.01 &&
    splitRows.every((r) => (parseFloat(r.value) || 0) > 0);

  function splitRowAmount(row: SplitRow) {
    const v = parseFloat(row.value) || 0;
    return splitBasis === 'percentage' ? (v / 100) * totalAmt : v;
  }

  function addSplitRow() {
    setSplitRows((rows) => [...rows, { id: crypto.randomUUID(), method: '', value: '' }]);
  }

  function removeSplitRow(id: string) {
    setSplitRows((rows) => (rows.length > 2 ? rows.filter((r) => r.id !== id) : rows));
  }

  function updateSplitRow(id: string, patch: Partial<SplitRow>) {
    setSplitRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function resetForm() {
    setAmount(''); setMethod(''); setNote(''); setShowForm(false);
    setSplitMode(false); setSplitBasis('percentage'); setSplitRows(makeSplitRows());
  }

  async function handleDiscountSave() {
    const discountAmount = discountInput.trim() ? Number(discountInput) : 0;
    if (Number.isNaN(discountAmount) || discountAmount < 0) {
      toast.error(t('appointments.errInvalidDiscount'));
      return;
    }
    try {
      await updateMut.mutateAsync({ id: appointment.id, body: { discountAmount } });
      toast.success(t('common.updated'));
      setEditingDiscount(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  async function handleAdd() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error(t('paymentPanel.enterValidAmount')); return; }
    if (splitMode && !splitValid) { toast.error(t('paymentPanel.splitMismatch')); return; }
    try {
      if (splitMode) {
        for (const row of splitRows) {
          await addMut.mutateAsync({
            appointmentId: appointment.id,
            amount: Number(splitRowAmount(row).toFixed(3)),
            paymentMethod: row.method || null,
            note: note || null,
          });
        }
      } else {
        await addMut.mutateAsync({
          appointmentId: appointment.id,
          amount: amt,
          paymentMethod: method || null,
          note: note || null,
        });
      }
      toast.success(t('paymentPanel.savePayment'));
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  async function handleRemove(paymentId: string) {
    try {
      await removeMut.mutateAsync({ appointmentId: appointment.id, paymentId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {t('paymentPanel.sectionLabel')}
          </span>
        </div>
        <span className={cn(
          'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
          PAY_STATUS_STYLE[appointment.paymentStatus] ?? 'bg-surface-page text-gray-400',
        )}>
          {appointment.paymentStatus}
        </span>
      </div>

      {payments.length > 0 && (
        <div className="space-y-1.5">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 flex items-center gap-2 text-gray-600">
                <span className="capitalize">
                  {p.paymentMethod?.replace(/_/g, ' ') ?? t('paymentPanel.sectionLabel')}
                </span>
                {p.note && <span className="text-gray-400 text-xs">— {p.note}</span>}
              </div>
              <span className="font-mono font-medium text-gray-800">
                {formatCurrency(p.amount, currency)}
              </span>
              {!readOnly && !terminal && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remove payment"
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

      <div className="rounded-lg bg-surface-card border border-border p-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>{t('appointments.labelPrice')}</span>
          <span className="font-mono">{formatCurrency(appointment.price, currency)}</span>
        </div>
        <div className="flex justify-between items-center text-gray-500">
          <span>{t('appointments.labelDiscount')}</span>
          {!editingDiscount ? (
            <button
              type="button"
              disabled={terminal || !canEditDiscount}
              onClick={() => {
                setDiscountInput(appointment.discountAmount ? String(appointment.discountAmount) : '');
                setEditingDiscount(true);
              }}
              className="font-mono text-gray-500 hover:text-primary-600 disabled:hover:text-gray-500 disabled:cursor-default"
            >
              {appointment.discountAmount > 0
                ? `− ${formatCurrency(appointment.discountAmount, currency)}`
                : '—'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="h-7 w-24 font-mono text-end"
              />
              <Button size="sm" className="h-7 px-2" onClick={handleDiscountSave} disabled={updateMut.isPending}>
                {t('common.save')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingDiscount(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          )}
        </div>
        {appointment.taxAmount > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>{t('invoicePreview.tax')}</span>
            <span className="font-mono">{formatCurrency(appointment.taxAmount, currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-gray-900 border-t border-border pt-1.5">
          <span>{t('invoicePreview.total')}</span>
          <span className="font-mono">{formatCurrency(appointment.total, currency)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>{t('paymentPanel.paid')}</span>
          <span className="font-mono">{formatCurrency(appointment.amountPaid, currency)}</span>
        </div>
        {remaining > 0.001 ? (
          <div className="flex justify-between font-semibold text-orange-600 pt-1 border-t border-border">
            <span>{t('paymentPanel.balanceDue')}</span>
            <span className="font-mono">{formatCurrency(remaining, currency)}</span>
          </div>
        ) : appointment.amountPaid > 0 ? (
          <div className="flex justify-between font-semibold text-green-600 pt-1 border-t border-border">
            <span>{t('paymentPanel.fullyPaid')}</span>
          </div>
        ) : null}
      </div>

      {!readOnly && !terminal && (
        !showForm ? (
          <button
            type="button"
            onClick={() => { setShowForm(true); setAmount(remaining > 0 ? remaining.toFixed(3) : ''); }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 py-1 rounded-lg border border-dashed border-primary-200 hover:border-primary-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> {t('paymentPanel.addEntry')}
          </button>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  {t('paymentPanel.amountLabel')} *
                </label>
                <Input
                  type="number" min="0" step="0.001"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.000" className="font-mono text-sm h-8"
                />
              </div>
              {!splitMode && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    {t('paymentPanel.methodLabel')}
                  </label>
                  <ConfigSelect
                    listKey="payment_method"
                    value={method}
                    onValueChange={setMethod}
                    placeholder={t('common.selectPlaceholder')}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSplitMode((v) => !v)}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              {splitMode ? t('paymentPanel.singleMethod') : t('paymentPanel.splitPayment')}
            </button>

            {splitMode && (
              <div className="space-y-2 rounded-lg border border-dashed border-border p-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex rounded-md border border-border overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setSplitBasis('percentage')}
                      className={cn('px-2 py-1', splitBasis === 'percentage' ? 'bg-primary-600 text-white' : 'bg-surface-card text-gray-500')}
                    >
                      {t('paymentPanel.splitByPercentage')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitBasis('amount')}
                      className={cn('px-2 py-1', splitBasis === 'amount' ? 'bg-primary-600 text-white' : 'bg-surface-card text-gray-500')}
                    >
                      {t('paymentPanel.splitByAmount')}
                    </button>
                  </div>
                  <span className={cn('text-xs font-mono', splitValid ? 'text-green-600' : 'text-orange-600')}>
                    {t('paymentPanel.splitRemaining')}:{' '}
                    {splitBasis === 'percentage'
                      ? `${(100 - splitBasisSum).toFixed(1)}%`
                      : formatCurrency(totalAmt - splitBasisSum, currency)}
                  </span>
                </div>

                {splitRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <ConfigSelect
                      listKey="payment_method"
                      value={row.method}
                      onValueChange={(v) => updateSplitRow(row.id, { method: v })}
                      placeholder={t('common.selectPlaceholder')}
                    />
                    <Input
                      type="number" min="0" step={splitBasis === 'percentage' ? '1' : '0.001'}
                      value={row.value} onChange={(e) => updateSplitRow(row.id, { value: e.target.value })}
                      placeholder={splitBasis === 'percentage' ? '%' : '0.000'}
                      className="font-mono text-sm h-8 w-24"
                    />
                    <Button
                      size="sm" variant="ghost" aria-label={t('paymentPanel.removeRow')}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={() => removeSplitRow(row.id)}
                      disabled={splitRows.length <= 2}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addSplitRow}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
                >
                  <Plus className="h-3 w-3" strokeWidth={1.75} /> {t('paymentPanel.addRow')}
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('paymentPanel.noteLabel')}</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} className="text-sm h-8" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={resetForm} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button
                size="sm" onClick={handleAdd} disabled={addMut.isPending || (splitMode && !splitValid)}
                className="flex-1" style={{ background: 'var(--mod-haraka)' }}
              >
                {addMut.isPending ? t('paymentPanel.savingPayment') : t('paymentPanel.savePayment')}
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
