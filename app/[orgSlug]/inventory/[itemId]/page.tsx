'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInventoryItem, useInventoryTransactions } from '@/hooks/inventory';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug } from '@/hooks/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { InventoryTransaction } from '@/types';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { InventoryItemForm } from '@/components/inventory/InventoryItemForm';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { RequestInventoryModal } from '@/components/inventory/RequestInventoryModal';
function EditSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M11 3l2 2-8 8H3v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /></svg>; }
function ArrowUpCircleSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M8 11V5M5.5 7.5L8 5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function ArrowDownCircleSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M8 5v6M5.5 8.5L8 11l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function RefreshCwSVG({ size = 14 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden><path d="M3 7a4 4 0 0 1 7.2-2.4M11 7a4 4 0 0 1-7.2 2.4M11 3v3h-3M3 11V8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function AlertTriangleSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /><path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function TrendingUpSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M1 10l3.5-3.5 2.5 2.5 5-5M9 4h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function TrendingDownSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M1 4l3.5 3.5 2.5-2.5 5 5M9 10h3V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/date';

const TX_LABELS = { in: 'Stock In', out: 'Stock Out', adjustment: 'Adjustment' };
const TX_ICONS = {
  in: <span className="text-emerald-600"><ArrowUpCircleSVG /></span>,
  out: <span className="text-red-500"><ArrowDownCircleSVG /></span>,
  adjustment: <span className="text-indigo-500"><RefreshCwSVG /></span>,
};

function StockStatusBar({ qty, threshold }: { qty: number; threshold: number }) {
  const pct = threshold === 0 ? 100 : Math.min(100, (qty / (threshold * 3)) * 100);
  const color = qty === 0 ? 'bg-red-500' : qty < threshold ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function InventoryItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: item, isLoading } = useInventoryItem(itemId);
  const { data: txData, isLoading: txLoading } = useInventoryTransactions(itemId);
  const transactions = txData?.transactions ?? [];

  const [txType, setTxType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [txQty, setTxQty] = useState('');
  const [txReason, setTxReason] = useState('');
  const [txNote, setTxNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Item deleted');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      router.push(`/${orgSlug}/inventory`);
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (!item) return <div className="text-gray-500 p-6">Item not found.</div>;

  const stockColor = item.stockStatus === 'ok' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : item.stockStatus === 'low' ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200';

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!txQty || !txReason) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: txType, quantity: Number(txQty), reason: txReason, note: txNote }),
      });
      if (!res.ok) throw new Error();
      toast.success('Stock updated');
      setTxQty('');
      setTxReason('');
      setTxNote('');
      qc.invalidateQueries({ queryKey: ['inventory', itemId] });
      qc.invalidateQueries({ queryKey: ['inventory-transactions', itemId] });
    } catch {
      toast.error('Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={item.name}
        breadcrumb={[{ label: 'Inventory', href: '/inventory' }, { label: item.name, href: `/inventory/${itemId}` }]}
        actions={(
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setReqOpen(true)}>
              <span className="mr-1">Request Refill</span>
            </Button>
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <EditSVG /><span className="ml-1">Edit</span>
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(true)}>
                  <span>Delete Item</span>
                </Button>
              </>
            )}
          </div>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details + stock card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Stock Level</h2>
              <span className={cn('px-2.5 py-0.5 rounded-full border text-xs font-medium', stockColor)}>
                {item.stockStatus === 'ok' ? 'In Stock' : item.stockStatus === 'low' ? 'Low Stock' : 'Out of Stock'}
              </span>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-5xl font-bold text-gray-900">{item.quantityOnHand}</span>
              <span className="text-lg text-gray-500 mb-1">{item.unit}</span>
            </div>
            <StockStatusBar qty={item.quantityOnHand} threshold={item.minimumThreshold} />
            <div className="mt-2 text-xs text-gray-400">Minimum threshold: {item.minimumThreshold} {item.unit}</div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                { label: 'Category', value: item.category },
                { label: 'SKU', value: item.sku || '—' },
                { label: 'Unit', value: item.unit },
                { label: 'Reorder Qty', value: item.reorderQuantity ? `${item.reorderQuantity} ${item.unit}` : '—' },
                { label: 'Unit Cost', value: item.unitCost ? `${item.unitCost.toFixed(3)} JOD` : '—' },
                { label: 'Location', value: item.location || '—' },
                { label: 'Supplier', value: item.supplier || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
                  <dd className="text-gray-900 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {item.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-xs text-gray-400 mb-1">Notes</dt>
                <dd className="text-sm text-gray-700">{item.notes}</dd>
              </div>
            )}
          </div>

          {/* Transaction history */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Transaction History</h2>
            </div>
            {txLoading ? (
              <div className="p-6 text-sm text-gray-400">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-sm text-gray-400">No transactions yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {transactions.map((tx: InventoryTransaction) => (
                  <div key={tx.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="flex-shrink-0">{TX_ICONS[tx.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{TX_LABELS[tx.type]}</span>
                        <span className="text-xs text-gray-400">{tx.reason}</span>
                      </div>
                      {tx.note && <div className="text-xs text-gray-400 truncate">{tx.note}</div>}
                      <div className="text-xs text-gray-400">{tx.performedByName || tx.performedByEmail} · {formatDate(tx.performedAt)}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('text-sm font-semibold', tx.type === 'in' ? 'text-emerald-600' : tx.type === 'out' ? 'text-red-500' : 'text-indigo-600')}>
                        {tx.type === 'in' ? '+' : tx.type === 'out' ? '−' : ''}{tx.quantity} {item.unit}
                      </div>
                      <div className="text-xs text-gray-400">{tx.quantityBefore} → {tx.quantityAfter}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: stock adjustment */}
        {isAdmin && (
          <div className="space-y-6">
            {item.stockStatus !== 'ok' && (
              <div className={cn('flex items-start gap-2 p-4 rounded-lg border text-sm', stockColor)}>
                <AlertTriangleSVG />
                <div>
                  {item.stockStatus === 'out'
                    ? `Out of stock. Reorder ${item.reorderQuantity ? `${item.reorderQuantity} ${item.unit}` : 'now'}.`
                    : `Stock is low (${item.quantityOnHand} remaining, min ${item.minimumThreshold}).`}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Adjust Stock</h2>
              <form onSubmit={handleTransaction} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Type</label>
                  <Select value={txType} onValueChange={(v) => setTxType(v as typeof txType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">
                        <span className="flex items-center gap-2 text-emerald-600"><TrendingUpSVG /> Stock In</span>
                      </SelectItem>
                      <SelectItem value="out">
                        <span className="flex items-center gap-2 text-red-500"><TrendingDownSVG /> Stock Out</span>
                      </SelectItem>
                      <SelectItem value="adjustment">
                        <span className="flex items-center gap-2 text-indigo-500"><RefreshCwSVG /> Set Absolute</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {txType === 'adjustment' ? `New Quantity (${item.unit})` : `Quantity (${item.unit})`}
                  </label>
                  <Input type="number" min="1" value={txQty} onChange={(e) => setTxQty(e.target.value)} placeholder="0" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reason *</label>
                  <Input value={txReason} onChange={(e) => setTxReason(e.target.value)} placeholder="e.g. Received from supplier" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                  <Input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="Additional details..." />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Stock'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      <FormDrawer open={editOpen} onOpenChange={setEditOpen} title={`Edit: ${item.name}`} width="xl">
        <InventoryItemForm item={item} onSuccess={() => setEditOpen(false)} />
      </FormDrawer>

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(false)}
        title="Delete Item"
        description={`Delete "${item.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />

      <RequestInventoryModal
        open={reqOpen}
        onOpenChange={setReqOpen}
        itemId={item.id}
        itemName={item.name}
      />
    </div>
  );
}
