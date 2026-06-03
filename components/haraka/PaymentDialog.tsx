'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, CreditCard, MoreHorizontal, FileCheck, ChevronDown, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { computeChange } from '@/lib/modules/haraka/pricing/calc';

export interface PaymentLine {
  method: 'cash' | 'card';
  amount: number;
  cardLast4?: string;
}

type TabMethod = 'cash' | 'card' | 'other';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (payments: PaymentLine[]) => void;
  loading?: boolean;
  /** Pre-select a payment method when the dialog opens. */
  initialTab?: TabMethod;
}

export function PaymentDialog({ open, onOpenChange, total, onConfirm, loading, initialTab }: Props) {
  const [tab, setTab] = useState<TabMethod>(initialTab ?? 'cash');
  const [amount, setAmount] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [splitMode, setSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState<PaymentLine[]>([]);

  useEffect(() => {
    if (open) {
      const startTab = initialTab ?? 'cash';
      setTab(startTab);
      setAmount(startTab !== 'other' ? total.toFixed(2) : '');
      setCardLast4('');
      setSplitMode(false);
      setSplitRows([{ method: 'cash', amount: total }]);
    }
  }, [open, total, initialTab]);

  const numAmount = Number(amount) || 0;
  const change = tab === 'cash' ? Math.max(0, numAmount - total) : 0;
  const remaining = tab === 'cash' ? Math.max(0, total - numAmount) : 0;
  const simpleCanSubmit = tab !== 'other' && numAmount + 0.001 >= total;

  const splitPaid = splitRows.reduce((a, r) => a + (Number.isFinite(r.amount) ? r.amount : 0), 0);
  const splitRemaining = +(total - splitPaid).toFixed(4);
  const splitChange = useMemo(() => computeChange(total, splitRows), [total, splitRows]);
  const splitCanSubmit = splitPaid + 0.001 >= total && splitRows.every((r) => r.amount >= 0);

  function setSplitRow(idx: number, patch: Partial<PaymentLine>) {
    setSplitRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function confirm() {
    if (splitMode) {
      onConfirm(
        splitRows
          .filter((r) => r.amount > 0)
          .map((r) => ({ ...r, amount: +r.amount.toFixed(4) })) as PaymentLine[],
      );
    } else {
      onConfirm([{
        method: tab === 'card' ? 'card' : 'cash',
        amount: +numAmount.toFixed(4),
        cardLast4: tab === 'card' ? cardLast4 || undefined : undefined,
      }]);
    }
  }

  const tabs: { key: TabMethod; label: string; icon: React.ReactNode }[] = [
    { key: 'cash', label: 'Cash', icon: <Banknote size={14} /> },
    { key: 'card', label: 'Card', icon: <CreditCard size={14} /> },
    { key: 'other', label: 'Other', icon: <MoreHorizontal size={14} /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
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
                      setAmount(key === 'cash' ? total.toFixed(2) : '');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
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

              {tab === 'other' ? (
                <div className="rounded-lg border border-border bg-surface-inset px-4 py-6 text-center space-y-2">
                  <p className="text-sm text-gray-500">Record a non-cash, non-card payment (voucher, transfer, etc.)</p>
                  <p className="font-mono font-bold text-gray-800">JOD {total.toFixed(2)}</p>
                </div>
              ) : (
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

                  {tab === 'card' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                        Card last 4 digits (optional)
                      </label>
                      <Input
                        placeholder="••••"
                        maxLength={4}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="font-mono w-28"
                      />
                    </div>
                  )}

                  {tab === 'cash' && (
                    <div
                      className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold"
                      style={
                        remaining > 0
                          ? { background: 'var(--red-50)', color: 'var(--red-700)' }
                          : { background: 'var(--green-50)', color: 'var(--green-700)' }
                      }
                    >
                      <span>{remaining > 0 ? 'Still owed' : 'Change due'}</span>
                      <span className="font-mono">{(remaining > 0 ? remaining : change).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Fawtara note */}
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 text-green-700 px-3 py-2.5 text-xs">
                <FileCheck size={14} className="flex-shrink-0" />
                <span>Fawtara e-invoice will be submitted automatically after sale.</span>
              </div>

              {/* Split toggle */}
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => {
                  // Start split with two rows: first half cash, second half card
                  const half = +(total / 2).toFixed(2);
                  const rest = +(total - half).toFixed(2);
                  setSplitRows([
                    { method: 'cash', amount: half },
                    { method: 'card', amount: rest },
                  ]);
                  setSplitMode(true);
                }}
              >
                <ChevronDown size={12} /> Split payment
              </button>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-surface-inset px-4 py-2.5 flex items-center justify-between text-sm border border-border">
                <span className="text-gray-500">Total due</span>
                <span className="font-mono font-bold">JOD {total.toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                {splitRows.map((r, idx) => {
                  // Remaining if this row were set to 0
                  const otherPaid = splitRows
                    .filter((_, i) => i !== idx)
                    .reduce((a, x) => a + (Number.isFinite(x.amount) ? x.amount : 0), 0);
                  const needed = +(total - otherPaid).toFixed(2);
                  const isBalanced = Math.abs(r.amount - needed) < 0.01;
                  return (
                    <div key={idx} className="grid grid-cols-[90px_1fr_auto_auto] gap-2 items-center">
                      <select
                        className="rounded-md border border-border px-2 py-1.5 text-sm bg-surface-card"
                        value={r.method}
                        onChange={(e) => setSplitRow(idx, { method: e.target.value as 'cash' | 'card' })}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                      </select>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={r.amount || ''}
                        onChange={(e) => setSplitRow(idx, { amount: Number(e.target.value || 0) })}
                        className="font-mono"
                      />
                      {/* Balance button: fills this row to cover the remaining */}
                      {!isBalanced && needed > 0 && (
                        <button
                          type="button"
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-gray-500 hover:text-gray-700 border border-border whitespace-nowrap"
                          title={`Fill to ${needed.toFixed(2)}`}
                          onClick={() => setSplitRow(idx, { amount: needed })}
                        >
                          ={needed.toFixed(2)}
                        </button>
                      )}
                      {splitRows.length > 1 ? (
                        <button
                          type="button"
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          onClick={() => setSplitRows((p) => p.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : <span />}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 items-center">
                <Button size="sm" variant="outline" type="button"
                  onClick={() => {
                    // Rebalance: give the new row the remaining balance, zero out overpay on existing rows
                    const newAmount = Math.max(0, splitRemaining);
                    setSplitRows((p) => [...p, { method: 'cash', amount: newAmount }]);
                  }}>
                  <Banknote size={13} className="me-1" /> + Cash
                </Button>
                <Button size="sm" variant="outline" type="button"
                  onClick={() => {
                    const newAmount = Math.max(0, splitRemaining);
                    setSplitRows((p) => [...p, { method: 'card', amount: newAmount }]);
                  }}>
                  <CreditCard size={13} className="me-1" /> + Card
                </Button>
                <button type="button" className="ms-auto text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => setSplitMode(false)}>
                  Simple
                </button>
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
                <span className="font-mono">{(splitRemaining > 0 ? splitRemaining : splitChange).toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 text-green-700 px-3 py-2.5 text-xs">
                <FileCheck size={14} className="flex-shrink-0" />
                <span>Fawtara e-invoice will be submitted automatically.</span>
              </div>
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
