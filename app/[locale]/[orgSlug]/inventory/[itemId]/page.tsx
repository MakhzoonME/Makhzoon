'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInventoryItem, useInventoryTransactions } from '@/hooks/inventory';
import { useWarranties } from '@/hooks/warranties';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug, useT } from '@/hooks/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { InventoryTransaction, Warranty } from '@/types';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { InventoryItemForm } from '@/components/inventory/InventoryItemForm';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { RequestInventoryModal } from '@/components/inventory/RequestInventoryModal';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pencil, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { formatDate, isExpired, getWarrantyStatus } from '@/lib/utils/date';

const TX_LABELS = { in: 'Stock In', out: 'Stock Out', adjustment: 'Adjustment' };
const TX_ICONS = {
  in: <span className="text-emerald-600"><ArrowUpCircle className="h-4 w-4" strokeWidth={1.75} /></span>,
  out: <span className="text-red-500"><ArrowDownCircle className="h-4 w-4" strokeWidth={1.75} /></span>,
  adjustment: <span className="text-primary-500"><RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} /></span>,
};

function StockStatusBar({ qty, threshold }: { qty: number; threshold: number }) {
  const pct = threshold === 0 ? 100 : Math.min(100, (qty / (threshold * 3)) * 100);
  const color = qty === 0 ? 'bg-red-500' : qty < threshold ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="w-full bg-surface-page rounded-full h-2 overflow-hidden">
      <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function InventoryItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { locale } = useT();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: item, isLoading } = useInventoryItem(itemId);
  const { data: txData, isLoading: txLoading } = useInventoryTransactions(itemId);
  const { data: warrantiesResponse, isLoading: wLoading } = useWarranties({ inventoryItemId: itemId });
  const transactions = txData?.transactions ?? [];
  const warranties = warrantiesResponse?.items ?? [];

  const [txType, setTxType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [txQty, setTxQty] = useState('');
  const [txReason, setTxReason] = useState('');
  const [txNote, setTxNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editWarrantyTarget, setEditWarrantyTarget] = useState<Warranty | null>(null);
  const [addWarrantyOpen, setAddWarrantyOpen] = useState(false);

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

  const stockColor = item.stockStatus === 'ok' ? 'text-[var(--green-700)] bg-[var(--green-100)] border-[var(--green-100)]'
    : item.stockStatus === 'low' ? 'text-[var(--yellow-700)] bg-[var(--yellow-100)] border-[var(--yellow-100)]'
    : 'text-[var(--red-700)] bg-[var(--red-100)] border-[var(--red-100)]';

  const wColumns: ColumnDef<Warranty>[] = [
    { key: 'vendor', header: 'Vendor', render: (w) => <span className="text-sm font-medium">{w.vendor}</span> },
    { key: 'startDate', header: 'Start', render: (w) => <span className="text-sm text-gray-500 tabular-nums">{formatDate(w.startDate)}</span> },
    {
      key: 'endDate', header: 'End',
      render: (w) => (
        <span className={`text-sm tabular-nums font-medium ${isExpired(w.endDate) ? 'text-red-600 dark:text-red-400' : 'text-gray-700'}`}>
          {formatDate(w.endDate)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: '',
      render: (w) => isAdmin ? (
        <Button size="sm" variant="ghost" onClick={() => setEditWarrantyTarget(w)}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
      ) : null,
    },
  ];

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
        breadcrumb={[{ label: 'Inventory', href: `/${orgSlug}/inventory` }, { label: item.name, href: `/${orgSlug}/inventory/${itemId}` }]}
        actions={(
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setReqOpen(true)}>
              <span className="mr-1">Request Refill</span>
            </Button>
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" strokeWidth={1.75} /><span className="ml-1">Edit</span>
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
          <div className="bg-surface-card rounded-lg border border-border p-6">
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
          <div className="bg-surface-card rounded-lg border border-border p-6">
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
              <div className="mt-4 pt-4 border-t border-border">
                <dt className="text-xs text-gray-400 mb-1">Notes</dt>
                <dd className="text-sm text-gray-700">{item.notes}</dd>
              </div>
            )}
          </div>

          {/* Transaction history */}
          <div className="bg-surface-card rounded-lg border border-border">
            <div className="px-6 py-4 border-b border-border">
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
                      {tx.note && (
                        <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><div className="text-xs text-gray-400 truncate">{tx.note}</div></TooltipTrigger><TooltipContent>{tx.note}</TooltipContent></Tooltip></TooltipProvider>
                      )}
                      <div className="text-xs text-gray-400">{tx.performedByName || tx.performedByEmail} · {formatDate(tx.performedAt)}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('text-sm font-semibold', tx.type === 'in' ? 'text-emerald-600' : tx.type === 'out' ? 'text-red-500' : 'text-primary-600')}>
                        {tx.type === 'in' ? '+' : tx.type === 'out' ? '−' : ''}{tx.quantity} {item.unit}
                      </div>
                      <div className="text-xs text-gray-400">{tx.quantityBefore} → {tx.quantityAfter}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warranties */}
          <Card>
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Warranties</h2>
                {isAdmin && (() => {
                  const now = new Date();
                  const hasActiveWarranty = (warranties as Warranty[]).some((w) => new Date(w.endDate) >= now);
                  return !hasActiveWarranty ? (
                    <Button size="sm" variant="ghost" onClick={() => setAddWarrantyOpen(true)}>
                      <span>+ Add warranty</span>
                    </Button>
                  ) : null;
                })()}
              </div>
              <DataTable
                data={warranties}
                columns={wColumns}
                isLoading={wLoading}
                emptyMessage="No warranties attached."
                keyExtractor={(w) => w.id}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: stock adjustment */}
        {isAdmin && (
          <div className="space-y-6">
            {item.stockStatus !== 'ok' && (
              <div className={cn('flex items-start gap-2 p-4 rounded-lg border text-sm', stockColor)}>
                <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                <div>
                  {item.stockStatus === 'out'
                    ? `Out of stock. Reorder ${item.reorderQuantity ? `${item.reorderQuantity} ${item.unit}` : 'now'}.`
                    : `Stock is low (${item.quantityOnHand} remaining, min ${item.minimumThreshold}).`}
                </div>
              </div>
            )}

            <div className="bg-surface-card rounded-lg border border-border p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Adjust Stock</h2>
              <form onSubmit={handleTransaction} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Type</label>
                  <Select value={txType} onValueChange={(v) => setTxType(v as typeof txType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">
                        <span className="flex items-center gap-2 text-emerald-600"><TrendingUp className="h-4 w-4" strokeWidth={1.75} /> Stock In</span>
                      </SelectItem>
                      <SelectItem value="out">
                        <span className="flex items-center gap-2 text-red-500"><TrendingDown className="h-4 w-4" strokeWidth={1.75} /> Stock Out</span>
                      </SelectItem>
                      <SelectItem value="adjustment">
                        <span className="flex items-center gap-2 text-primary-500"><RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} /> Set Absolute</span>
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

      <FormDrawer
        open={!!editWarrantyTarget}
        onOpenChange={(o) => { if (!o) setEditWarrantyTarget(null); }}
        title="Edit Warranty"
      >
        {editWarrantyTarget && (
          <WarrantyForm warranty={editWarrantyTarget} onSuccess={() => setEditWarrantyTarget(null)} />
        )}
      </FormDrawer>

      <FormDrawer open={addWarrantyOpen} onOpenChange={setAddWarrantyOpen} title="Add Warranty">
        <WarrantyForm
          defaultInventoryItemId={item.id}
          onSuccess={() => setAddWarrantyOpen(false)}
        />
      </FormDrawer>
    </div>
  );
}
