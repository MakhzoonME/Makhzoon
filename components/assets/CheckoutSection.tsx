'use client';
import { useState } from 'react';
import { useCheckouts, useCheckoutAsset, useReturnAsset } from '@/hooks/useCheckouts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils/date';
import { toast } from '@/hooks/useToast';
import { ArrowUpRight, ArrowDownLeft, UserCheck, History } from 'lucide-react';

export function CheckoutSection({ assetId, assetName }: { assetId: string; assetName: string }) {
  const { data: checkouts = [], isLoading } = useCheckouts(assetId);
  const checkoutMut = useCheckoutAsset(assetId);
  const returnMut = useReturnAsset(assetId);
  const [showForm, setShowForm] = useState(false);
  const [checkedOutTo, setCheckedOutTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const active = checkouts.find((c) => !c.returnedAt);
  const history = checkouts.filter((c) => c.returnedAt).slice(0, 5);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = active?.dueDate && new Date(active.dueDate) < today;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!checkedOutTo.trim()) return;
    try {
      await checkoutMut.mutateAsync({
        checkedOutTo: checkedOutTo.trim(),
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      setCheckedOutTo('');
      setDueDate('');
      setNotes('');
      setShowForm(false);
      toast.success(`${assetName} checked out`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to check out asset');
    }
  }

  async function handleReturn() {
    if (!active) return;
    try {
      await returnMut.mutateAsync(active.id);
      toast.success('Asset returned');
    } catch {
      toast.error('Failed to return asset');
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Checkout</h2>
        {active && (
          <span className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ml-auto ${overdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
            {overdue ? 'Overdue' : 'Checked out'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-5"><div className="h-16 rounded-md bg-gray-100 animate-pulse" /></div>
      ) : active ? (
        <div className="px-5 py-4">
          <p className="text-sm text-gray-900">
            Currently with <span className="font-semibold">{active.checkedOutTo}</span>
          </p>
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            <p>Checked out {formatDate(active.checkedOutAt)} by {active.checkedOutByEmail}</p>
            {active.dueDate && (
              <p className={overdue ? 'text-red-600 font-medium' : ''}>
                Due {formatDate(active.dueDate)}
              </p>
            )}
            {active.notes && <p className="text-gray-600 mt-1 italic">&ldquo;{active.notes}&rdquo;</p>}
          </div>
          <div className="flex justify-end mt-3">
            <Button size="sm" variant="outline" onClick={handleReturn} disabled={returnMut.isPending}>
              <ArrowDownLeft className="h-3.5 w-3.5 mr-1" />
              {returnMut.isPending ? 'Returning…' : 'Mark returned'}
            </Button>
          </div>
        </div>
      ) : showForm ? (
        <form onSubmit={handleCheckout} className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Checked out to</label>
            <Input
              value={checkedOutTo}
              onChange={(e) => setCheckedOutTo(e.target.value)}
              placeholder="Name or email"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Due date (optional)</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!checkedOutTo.trim() || checkoutMut.isPending}>
              {checkoutMut.isPending ? 'Saving…' : 'Check out'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="px-5 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">Not currently checked out.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />Check out
          </Button>
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <History className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recent history</p>
          </div>
          <ul className="space-y-1.5">
            {history.map((c) => (
              <li key={c.id} className="text-xs text-gray-600">
                <span className="font-medium text-gray-900">{c.checkedOutTo}</span>
                {' · '}
                {formatDate(c.checkedOutAt)}
                {c.returnedAt && <> → {formatDate(c.returnedAt)}</>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
