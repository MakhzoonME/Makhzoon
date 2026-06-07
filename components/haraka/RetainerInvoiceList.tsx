'use client';

import { useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useRetainerInvoices,
  useCreateRetainerInvoice,
  useUpdateRetainerInvoice,
  useDeleteRetainerInvoice,
} from '@/hooks/haraka';
import { toast } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import type { HarakaRetainer, HarakaRetainerInvoice } from '@/types';
import { cn } from '@/lib/utils/cn';

interface Props {
  retainer:  HarakaRetainer;
  currency?: string;
}

const PAY_STATUS_STYLE: Record<string, string> = {
  paid:    'bg-[var(--green-100)] text-[var(--green-700)]',
  partial: 'bg-orange-100 text-orange-700',
  unpaid:  'bg-[var(--red-100)] text-[var(--red-700)]',
};

function nextPeriodDates(retainer: HarakaRetainer): { start: string; end: string } {
  const base = retainer.nextBillingDate ?? retainer.startDate;
  const d    = new Date(base);
  const end  = new Date(base);
  if (retainer.billingCycle === 'monthly')   end.setMonth(end.getMonth() + 1);
  if (retainer.billingCycle === 'quarterly') end.setMonth(end.getMonth() + 3);
  if (retainer.billingCycle === 'annual')    end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return {
    start: d.toISOString().slice(0, 10),
    end:   end.toISOString().slice(0, 10),
  };
}

export function RetainerInvoiceList({ retainer, currency = 'JOD' }: Props) {
  const { data, isLoading }  = useRetainerInvoices(retainer.id);
  const createMut  = useCreateRetainerInvoice();
  const updateMut  = useUpdateRetainerInvoice();
  const deleteMut  = useDeleteRetainerInvoice();

  const [showForm,  setShowForm]  = useState(false);
  const suggested = nextPeriodDates(retainer);
  const [start,    setStart]    = useState(suggested.start);
  const [end,      setEnd]      = useState(suggested.end);
  const [due,      setDue]      = useState('');
  const [note,     setNote]     = useState('');

  const invoices = data?.invoices ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end) { toast.error('Start and end dates are required'); return; }
    try {
      await createMut.mutateAsync({
        retainerId: retainer.id,
        body: { billingPeriodStart: start, billingPeriodEnd: end, dueDate: due || null, notes: note || null },
      });
      toast.success('Invoice created');
      setShowForm(false); setNote('');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  }

  async function markPaid(inv: HarakaRetainerInvoice) {
    try {
      await updateMut.mutateAsync({
        retainerId: retainer.id,
        invoiceId:  inv.id,
        body: {
          paymentStatus: 'paid',
          amountPaid:    inv.total,
          paidAt:        new Date().toISOString(),
        },
      });
      toast.success('Marked as paid');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  }

  async function handleDelete(inv: HarakaRetainerInvoice) {
    try {
      await deleteMut.mutateAsync({ retainerId: retainer.id, invoiceId: inv.id });
      toast.success('Invoice deleted');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  }

  if (isLoading) return <div className="text-xs text-gray-400 py-4 text-center">Loading…</div>;

  return (
    <div className="space-y-3">
      {invoices.length === 0 && !showForm && (
        <div className="text-sm text-gray-400 text-center py-6">No invoices yet.</div>
      )}

      {invoices.map((inv) => (
        <div key={inv.id} className="rounded-xl border border-border bg-surface-page p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-mono font-semibold text-gray-500">{inv.invoiceNumber}</div>
              <div className="text-sm font-medium text-gray-800">
                {inv.billingPeriodStart} → {inv.billingPeriodEnd}
              </div>
              {inv.dueDate && <div className="text-xs text-gray-400">Due: {inv.dueDate}</div>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', PAY_STATUS_STYLE[inv.paymentStatus] ?? '')}>
                {inv.paymentStatus}
              </span>
              <span className="font-mono text-sm font-semibold text-gray-800">{formatCurrency(inv.total, currency)}</span>
            </div>
          </div>

          {inv.paymentStatus !== 'paid' && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm" variant="outline"
                className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => markPaid(inv)}
                disabled={updateMut.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Mark Paid
              </Button>
              <Button
                size="sm" variant="ghost"
                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(inv)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
            </div>
          )}
          {inv.notes && <div className="text-xs text-gray-400 mt-2">{inv.notes}</div>}
        </div>
      ))}

      {retainer.status === 'active' && (
        <>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 py-2 rounded-xl border border-dashed border-primary-200 hover:border-primary-400 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> Add Invoice
            </button>
          ) : (
            <form onSubmit={handleCreate} className="rounded-xl border border-border bg-surface-page p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Period start *</label>
                  <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="text-sm h-8" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Period end *</label>
                  <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="text-sm h-8" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Due date</label>
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="text-sm h-8" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Note</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" className="text-sm h-8" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                <Button size="sm" type="submit" disabled={createMut.isPending} className="flex-1" style={{ background: 'var(--mod-haraka)' }}>
                  {createMut.isPending ? 'Creating…' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
