'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, CreditCard, MoreHorizontal, FileCheck, AlertCircle, Trash2, ArrowLeft } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { computeChange } from '@/lib/modules/haraka/pricing/calc';

export interface PaymentLine {
  method: 'cash' | 'card' | 'other';
  amount: number;
  cardLast4?: string;
  reference?: string;
}

type TabMethod = 'cash' | 'card' | 'other';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (payments: PaymentLine[], skipFawtara: boolean) => void;
  loading?: boolean;
  /** Pre-select a payment method when the dialog opens. */
  initialTab?: TabMethod;
  /** Whether Fawtara is configured and enabled for this org. */
  fawtaraEnabled?: boolean;
}

export function PaymentDialog({
  open, onOpenChange, total, onConfirm, loading,
  initialTab, fawtaraEnabled = false,
}: Props) {
  const [tab, setTab] = useState<TabMethod>(initialTab ?? 'cash');
  const [amount, setAmount] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [otherRef, setOtherRef] = useState('');
  const [splitMode, setSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState<PaymentLine[]>([]);
  // Fawtara: default ON when enabled, cashier can bypass per sale
  const [includeFawtara, setIncludeFawtara] = useState(true);

  useEffect(() => {
    if (open) {
      const startTab = initialTab ?? 'cash';
      setTab(startTab);
      setAmount(startTab !== 'other' ? total.toFixed(2) : total.toFixed(2));
      setCardLast4('');
      setOtherRef('');
      setSplitMode(false);
      setSplitRows([
        { method: 'cash', amount: +(total / 2).toFixed(2) },
        { method: 'card', amount: +(total - +(total / 2).toFixed(2)).toFixed(2) },
      ]);
      setIncludeFawtara(true);
    }
  }, [open, total, initialTab]);

  // ── Simple mode ────────────────────────────────────────────────────────
  const numAmount = Number(amount) || 0;
  const cashChange = tab === 'cash' ? Math.max(0, numAmount - total) : 0;
  const cashOwed   = tab === 'cash' ? Math.max(0, total - numAmount) : 0;
  const simpleCanSubmit = tab === 'other'
    ? true
    : numAmount + 0.001 >= total;

  // ── Split mode ─────────────────────────────────────────────────────────
  const splitPaid      = splitRows.reduce((a, r) => a + (Number.isFinite(r.amount) ? r.amount : 0), 0);
  const splitRemaining = +(total - splitPaid).toFixed(4);
  const splitChange    = useMemo(() => computeChange(total, splitRows), [total, splitRows]);
  const splitCanSubmit = splitPaid + 0.001 >= total && splitRows.every((r) => r.amount >= 0);

  function setSplitRow(idx: number, patch: Partial<PaymentLine>) {
    setSplitRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function enterSplit() {
    const half = +(total / 2).toFixed(2);
    setSplitRows([
      { method: 'cash', amount: half },
      { method: 'card', amount: +(total - half).toFixed(2) },
    ]);
    setSplitMode(true);
  }

  function confirm() {
    const skipFawtara = !includeFawtara;
    if (splitMode) {
      onConfirm(
        splitRows
          .filter((r) => r.amount > 0)
          .map((r) => ({ ...r, amount: +r.amount.toFixed(4) })),
        skipFawtara,
      );
    } else {
      const payment: PaymentLine = {
        method: tab,
        amount: +numAmount.toFixed(4),
      };
      if (tab === 'card') payment.cardLast4 = cardLast4 || undefined;
      if (tab === 'other') payment.reference = otherRef || undefined;
      onConfirm([payment], skipFawtara);
    }
  }

  const tabs: { key: TabMethod; label: string; icon: React.ReactNode }[] = [
    { key: 'cash',  label: 'Cash',  icon: <Banknote size={14} /> },
    { key: 'card',  label: 'Card',  icon: <CreditCard size={14} /> },
    { key: 'other', label: 'Other', icon: <MoreHorizontal size={14} /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {splitMode ? (
              <button
                type="button"
                className="flex items-center gap-1.5 text-[18px] font-semibold hover:text-gray-600 transition-colors"
                onClick={() => setSplitMode(false)}
              >
                <ArrowLeft size={18} /> Split payment
              </button>
            ) : (
              'Take payment'
            )}
          </DialogTitle>
          <p className="text-sm text-gray-500 font-mono mt-0.5">
            Grand total JOD {total.toFixed(2)}
          </p>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {!splitMode ? (
            <>
              {/* Tab strip */}
              <div className="flex gap-1 p-1 rounded-lg bg-surface-inset border border-border">
                {tabs.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTab(key);
                      if (key !== 'other') setAmount(total.toFixed(2));
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors"
                    style={
                      tab === key
                        ? { background: 'var(--surface-card)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-xs)' }
                        : { color: 'var(--text-secondary)' }
                    }
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>

              {/* Cash */}
              {tab === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Amount received (JOD)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      autoFocus
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="font-mono text-base"
                    />
                  </div>
                  <div
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold"
                    style={
                      cashOwed > 0
                        ? { background: 'var(--red-50)', color: 'var(--red-700)' }
                        : { background: 'var(--green-50)', color: 'var(--green-700)' }
                    }
                  >
                    <span>{cashOwed > 0 ? 'Still owed' : 'Change due'}</span>
                    <span className="font-mono">{(cashOwed > 0 ? cashOwed : cashChange).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Card */}
              {tab === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Amount charged (JOD)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      autoFocus
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="font-mono text-base"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Card last 4 digits <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <Input
                      placeholder="••••"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="font-mono w-28"
                    />
                  </div>
                  <div
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}
                  >
                    <span>Exact charge</span>
                    <span className="font-mono">JOD {total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Other */}
              {tab === 'other' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-surface-inset px-4 py-3 text-sm text-gray-600">
                    <p className="font-medium text-gray-800 mb-0.5">Other payment method</p>
                    <p className="text-xs text-gray-500">Voucher, bank transfer, cheque, or any non-cash / non-card method.</p>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold bg-surface-inset border border-border">
                    <span className="text-gray-500">Amount due</span>
                    <span className="font-mono font-bold">JOD {total.toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Reference / note <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <Textarea
                      autoFocus
                      rows={2}
                      placeholder="e.g. Transfer ref #TRF-1234, voucher code…"
                      value={otherRef}
                      onChange={(e) => setOtherRef(e.target.value)}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Fawtara toggle — only when Fawtara is enabled in settings */}
              {fawtaraEnabled ? (
                <div
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 border text-xs gap-3"
                  style={
                    includeFawtara
                      ? { background: 'var(--green-50)', borderColor: 'var(--green-100)', color: 'var(--green-700)' }
                      : { background: 'var(--yellow-50)', borderColor: 'var(--yellow-100)', color: 'var(--yellow-700)' }
                  }
                >
                  <div className="flex items-center gap-2 flex-1">
                    {includeFawtara
                      ? <FileCheck size={14} className="flex-shrink-0" />
                      : <AlertCircle size={14} className="flex-shrink-0" />
                    }
                    <span className="font-medium">
                      {includeFawtara
                        ? 'Fawtara (ISTD) e-invoice will be submitted'
                        : 'Fawtara bypassed — no e-invoice for this sale'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex-shrink-0 relative inline-flex h-5 w-9 rounded-full transition-colors focus-visible:outline-none"
                    style={{ background: includeFawtara ? 'var(--green-600)' : 'var(--gray-300)' }}
                    onClick={() => setIncludeFawtara((v) => !v)}
                    aria-checked={includeFawtara}
                    role="switch"
                  >
                    <span
                      className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5"
                      style={{ transform: includeFawtara ? 'translateX(18px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>
              ) : null}

              {/* Split payment link */}
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline-offset-2 hover:underline"
                onClick={enterSplit}
              >
                Split payment between methods
              </button>
            </>
          ) : (
            /* ── Split mode ─────────────────────────────────────────────── */
            <>
              <div className="space-y-2">
                {splitRows.map((r, idx) => {
                  const otherPaid = splitRows
                    .filter((_, i) => i !== idx)
                    .reduce((a, x) => a + (Number.isFinite(x.amount) ? x.amount : 0), 0);
                  const needed     = +(total - otherPaid).toFixed(2);
                  const isBalanced = Math.abs(r.amount - needed) < 0.01;

                  return (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        className="rounded-lg border border-border px-2 py-2 text-sm bg-surface-card w-24 flex-shrink-0"
                        value={r.method}
                        onChange={(e) => setSplitRow(idx, { method: e.target.value as PaymentLine['method'] })}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="other">Other</option>
                      </select>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={r.amount || ''}
                        onChange={(e) => setSplitRow(idx, { amount: Number(e.target.value || 0) })}
                        className="font-mono flex-1"
                      />
                      {!isBalanced && needed > 0 && (
                        <button
                          type="button"
                          title={`Set to ${needed.toFixed(2)} to cover remaining`}
                          className="text-[10px] font-semibold px-1.5 py-1 rounded-md border border-border text-gray-500 hover:bg-surface-inset whitespace-nowrap flex-shrink-0"
                          onClick={() => setSplitRow(idx, { amount: needed })}
                        >
                          ={needed.toFixed(2)}
                        </button>
                      )}
                      {splitRows.length > 1 && (
                        <button
                          type="button"
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                          onClick={() => setSplitRows((p) => p.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" type="button"
                  onClick={() => setSplitRows((p) => [...p, { method: 'cash', amount: Math.max(0, splitRemaining) }])}>
                  <Banknote size={13} className="me-1" /> + Cash
                </Button>
                <Button size="sm" variant="outline" type="button"
                  onClick={() => setSplitRows((p) => [...p, { method: 'card', amount: Math.max(0, splitRemaining) }])}>
                  <CreditCard size={13} className="me-1" /> + Card
                </Button>
              </div>

              <div
                className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold"
                style={
                  splitRemaining > 0
                    ? { background: 'var(--red-50)', color: 'var(--red-700)' }
                    : { background: 'var(--green-50)', color: 'var(--green-700)' }
                }
              >
                <span>{splitRemaining > 0 ? 'Remaining' : 'Change to return'}</span>
                <span className="font-mono">
                  {(splitRemaining > 0 ? splitRemaining : splitChange).toFixed(2)}
                </span>
              </div>

              {/* Fawtara toggle in split mode too */}
              {fawtaraEnabled && (
                <div
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 border text-xs gap-3"
                  style={
                    includeFawtara
                      ? { background: 'var(--green-50)', borderColor: 'var(--green-100)', color: 'var(--green-700)' }
                      : { background: 'var(--yellow-50)', borderColor: 'var(--yellow-100)', color: 'var(--yellow-700)' }
                  }
                >
                  <div className="flex items-center gap-2 flex-1">
                    {includeFawtara
                      ? <FileCheck size={14} className="flex-shrink-0" />
                      : <AlertCircle size={14} className="flex-shrink-0" />
                    }
                    <span className="font-medium">
                      {includeFawtara ? 'Fawtara e-invoice will be submitted' : 'Fawtara bypassed'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex-shrink-0 relative inline-flex h-5 w-9 rounded-full transition-colors"
                    style={{ background: includeFawtara ? 'var(--green-600)' : 'var(--gray-300)' }}
                    onClick={() => setIncludeFawtara((v) => !v)}
                    role="switch"
                    aria-checked={includeFawtara}
                  >
                    <span
                      className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5"
                      style={{ transform: includeFawtara ? 'translateX(18px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={(splitMode ? !splitCanSubmit : !simpleCanSubmit) || loading}
            style={{ background: 'var(--mod-haraka)' }}
          >
            {loading ? 'Charging…' : 'Complete sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
