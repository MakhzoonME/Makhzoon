'use client';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useCheckouts, useCheckoutAsset, useReturnAsset } from '@/hooks/assets';
import { useAssignableUsers } from '@/hooks/users';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDate } from '@/lib/utils/date';
import { toast } from '@/hooks/ui';
import type { OrgUser } from '@/types';

function ArrowUpRightSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M4 10L10 4M10 4H5M10 4v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowDownLeftSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M10 4L4 10M4 10H9M4 10V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UserCheckSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="6.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M1 14c0-3 2.5-4.5 5.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M10 12l1.5 1.5 2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function HistorySVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2.5 7a4.5 4.5 0 1 0 .8-2.6M2.5 2v2.4H4.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 5v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckoutSection({ assetId, assetName }: { assetId: string; assetName: string }) {
  const { data: checkouts = [], isLoading } = useCheckouts(assetId);
  const { data: assignableUsers = [] } = useAssignableUsers();
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
    <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <UserCheckSVG />
        <h2 className="text-sm font-semibold text-gray-900">Checkout</h2>
        {active && (
          <span className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ms-auto ${overdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
            {overdue ? 'Overdue' : 'Checked out'}
          </span>
        )}
      </div>

      {isLoading || checkoutMut.isPending || returnMut.isPending ? (
        <div className="p-5"><div className="h-16 rounded-md bg-surface-page animate-pulse" /></div>
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
              <ArrowDownLeftSVG />
              <span className="ms-1">{returnMut.isPending ? 'Returning…' : 'Mark returned'}</span>
            </Button>
          </div>
        </div>
      ) : showForm ? (
        <form onSubmit={handleCheckout} className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Checked out to</label>
            <Select value={checkedOutTo} onValueChange={setCheckedOutTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {assignableUsers.length === 0 && (
                  <SelectItem value="__none" disabled>No users found</SelectItem>
                )}
                {assignableUsers.map((u: OrgUser) => (
                  <SelectItem key={u.id} value={u.displayName}>{u.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Due date (optional)</label>
            <DatePicker value={dueDate} onChange={(v) => setDueDate(v)} placeholder="Select due date (optional)" />
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
            <ArrowUpRightSVG /><span className="ms-1">Check out</span>
          </Button>
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t border-border px-5 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <HistorySVG />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recent history</p>
          </div>
          <ul className="space-y-1.5">
            {history.map((c) => (
              <li key={c.id} className="text-xs text-gray-600">
                <span className="font-medium text-gray-900">{c.checkedOutTo}</span>
                {' · '}
                {formatDate(c.checkedOutAt)}
                {c.returnedAt && <> <ArrowRight size={10} className="inline" aria-hidden /> {formatDate(c.returnedAt)}</>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
