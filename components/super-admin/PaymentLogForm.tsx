'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PaymentLogMethod } from '@/types';

const METHODS: PaymentLogMethod[] = ['CARD', 'BANK_TRANSFER', 'MANUAL', 'OTHER'];

export interface PaymentLogFormPayload {
  amount: number;
  currency: string;
  method: PaymentLogMethod;
  reference: string | null;
  paidAt: string; // ISO
  notes: string | null;
}

interface PaymentLogFormProps {
  onSubmit: (data: PaymentLogFormPayload) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
}

export function PaymentLogForm({ onSubmit, onCancel, submitting }: PaymentLogFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [method, setMethod] = useState<PaymentLogMethod>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    await onSubmit({
      amount: amt,
      currency: currency.toUpperCase(),
      method,
      reference: reference.trim() || null,
      paidAt: new Date(paidAt).toISOString(),
      notes: notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-4 pb-2">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="pmt-amount">Amount</Label>
          <Input
            id="pmt-amount"
            type="number"
            step="0.01"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pmt-currency">Currency</Label>
          <Input
            id="pmt-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            minLength={3}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pmt-method">Method</Label>
        <select
          id="pmt-method"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentLogMethod)}
          className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pmt-paidAt">Paid At</Label>
        <Input id="pmt-paidAt" type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pmt-ref">Reference (optional)</Label>
        <Input id="pmt-ref" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pmt-notes">Notes (optional)</Label>
        <Textarea id="pmt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !amount}>
          {submitting ? 'Saving…' : 'Record Payment'}
        </Button>
      </div>
    </form>
  );
}
