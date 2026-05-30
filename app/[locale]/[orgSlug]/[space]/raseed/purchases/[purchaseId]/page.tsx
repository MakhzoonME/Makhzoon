'use client';

import { use, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2, PackageCheck, XCircle } from 'lucide-react';
import { PageHeader, ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { usePurchase, useReceivePurchase, useDeletePurchase } from '@/hooks/inventory';
import { PurchaseStatusBadge } from '@/components/inventory/purchases/PurchaseStatusBadge';
import { toast } from '@/hooks/ui';

interface Props {
  params: Promise<{ locale: string; orgSlug: string; space: string; purchaseId: string }>;
}

export default function PurchaseDetailPage(props: Props) {
  const params = use(props.params);
  const router = useRouter();
  const { data, isLoading } = usePurchase(params.purchaseId);
  const receiveMut = useReceivePurchase();
  const deleteMut = useDeletePurchase();
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const purchase = data?.purchase;

  async function handleReceive() {
    if (!purchase) return;
    try {
      await receiveMut.mutateAsync(purchase.id);
      toast.success('Purchase received — stock levels updated');
      setConfirmReceive(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Receive failed');
    }
  }

  async function handleDelete() {
    if (!purchase) return;
    try {
      await deleteMut.mutateAsync(purchase.id);
      toast.success('Purchase deleted');
      router.push(`/${params.locale}/${params.orgSlug}/${params.space}/raseed/purchases`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!purchase) return <div className="p-6">Purchase not found.</div>;

  const unresolved = purchase.lines.filter((l) => !l.itemId);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <PageHeader
        title={`Purchase from ${purchase.supplierName}`}
        description={purchase.invoiceNumber ? `Invoice ${purchase.invoiceNumber}` : 'No invoice number'}
        breadcrumb={[
          { label: 'Raseed', href: `/${params.locale}/${params.orgSlug}/${params.space}/raseed` },
          { label: 'Purchases', href: `/${params.locale}/${params.orgSlug}/${params.space}/raseed/purchases` },
          { label: purchase.supplierName, href: '#' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <PurchaseStatusBadge status={purchase.status} />
            {purchase.status === 'draft' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/${params.locale}/${params.orgSlug}/${params.space}/raseed/purchases/${purchase.id}/edit`)}
                >
                  <Pencil size={14} className="me-1" /> Edit
                </Button>
                <Button
                  onClick={() => setConfirmReceive(true)}
                  disabled={unresolved.length > 0}
                  title={unresolved.length > 0 ? 'Resolve all line items first' : ''}
                >
                  <PackageCheck size={14} className="me-1" /> Receive
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Supplier</div>
          <div className="font-medium">{purchase.supplierName}</div>
          {purchase.supplierContact && <div className="text-gray-500">{purchase.supplierContact}</div>}
        </div>
        <div>
          <div className="text-gray-500">Invoice date</div>
          <div className="font-medium">{new Date(purchase.invoiceDate).toLocaleDateString()}</div>
        </div>
        <div>
          <div className="text-gray-500">Received</div>
          <div className="font-medium">
            {purchase.receivedDate ? new Date(purchase.receivedDate).toLocaleString() : '—'}
          </div>
          {purchase.receivedByName && <div className="text-gray-500">{purchase.receivedByName}</div>}
        </div>
        <div>
          <div className="text-gray-500">Total</div>
          <div className="font-mono font-semibold text-lg">{purchase.total.toFixed(2)}</div>
        </div>
      </div>

      {unresolved.length > 0 && purchase.status === 'draft' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 px-4 py-3 text-sm flex gap-2 items-center">
          <XCircle size={16} />
          {unresolved.length} line item(s) don&apos;t have a resolved inventory item. Edit the purchase to pick or create
          items for each line before receiving.
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-start">
            <tr>
              <th className="px-3 py-2 font-medium w-8">#</th>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Barcode / SKU</th>
              <th className="px-3 py-2 font-medium w-20">Qty</th>
              <th className="px-3 py-2 font-medium w-24">Unit cost</th>
              <th className="px-3 py-2 font-medium w-24 text-end">Tax</th>
              <th className="px-3 py-2 font-medium w-24 text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchase.lines.map((line, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                <td className="px-3 py-2">
                  {line.itemName}
                  {!line.itemId && (
                    <span className="ms-2 text-xs text-amber-600">(unresolved)</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">
                  {line.barcode || line.sku || '—'}
                </td>
                <td className="px-3 py-2">{line.quantity}</td>
                <td className="px-3 py-2 font-mono">{line.unitCost.toFixed(2)}</td>
                <td className="px-3 py-2 text-end font-mono">{line.taxAmount.toFixed(2)}</td>
                <td className="px-3 py-2 text-end font-mono">{line.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50 dark:bg-gray-800 font-medium">
            <tr>
              <td colSpan={5} className="px-3 py-2 text-end">Subtotal</td>
              <td className="px-3 py-2 text-end font-mono">{purchase.taxTotal.toFixed(2)}</td>
              <td className="px-3 py-2 text-end font-mono">{purchase.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={6} className="px-3 py-2 text-end">Total</td>
              <td className="px-3 py-2 text-end font-mono font-semibold">{purchase.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {purchase.notes && (
        <div className="text-sm">
          <div className="text-gray-500 mb-1">Notes</div>
          <div className="whitespace-pre-wrap">{purchase.notes}</div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReceive}
        onOpenChange={setConfirmReceive}
        title="Receive purchase?"
        description={`This will increase stock for ${purchase.lines.length} item(s) and mark the purchase as received. This cannot be undone.`}
        confirmLabel="Receive"
        variant="default"
        onConfirm={handleReceive}
        loading={receiveMut.isPending}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete draft?"
        description="This draft purchase will be permanently removed. Received purchases can't be deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
