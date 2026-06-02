'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, PackageCheck, AlertTriangle } from 'lucide-react';
import { PageHeader, ConfirmDialog, DocumentList } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { usePurchase, useReceivePurchase, useDeletePurchase } from '@/hooks/inventory';
import { PurchaseStatusBadge } from '@/components/inventory/purchases/PurchaseStatusBadge';
import { useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { toast } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';

/* ── Truck icon ──────────────────────────────────────────────────── */
function TruckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M1 3h12v11H1zM13 7h4l3 3v4h-7V7z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <circle cx="5"  cy="17" r="1.8" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="17" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

interface Props {
  params: Promise<{ locale: string; orgSlug: string; space: string; purchaseId: string }>;
}

export default function PurchaseDetailPage(props: Props) {
  const params      = use(props.params);
  const router      = useRouter();
  const { t }       = useT();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = usePurchase(params.purchaseId);
  const receiveMut  = useReceivePurchase();
  const deleteMut   = useDeletePurchase();
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  const purchase = data?.purchase;
  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/raseed`;

  async function handleReceive() {
    if (!purchase) return;
    try {
      await receiveMut.mutateAsync(purchase.id);
      toast.success(t('purchases.receiveSuccess'));
      setConfirmReceive(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Receive failed');
    }
  }

  async function handleDelete() {
    if (!purchase) return;
    try {
      await deleteMut.mutateAsync(purchase.id);
      toast.success(t('purchases.deleteSuccess'));
      router.push(`${base}/purchases`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (!purchase) return (
    <ErrorState
      title={t('purchases.noPurchases')}
      message="Purchase not found."
      action={{ label: t('nav.purchases'), onClick: () => router.push(`${base}/purchases`) }}
    />
  );

  const unresolved = purchase.lines.filter((l) => !l.itemId);
  const isDraft    = purchase.status === 'draft';

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title={`${t('col.supplier')}: ${purchase.supplierName}`}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.inventory'), href: `${base}/list` },
          { label: t('nav.purchases'), href: `${base}/purchases` },
          { label: purchase.supplierName, href: '#' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <PurchaseStatusBadge status={purchase.status} />
            {isDraft && (
              <>
                <Button variant="outline" className="cursor-pointer transition-colors duration-150"
                  onClick={() => router.push(`${base}/purchases/${purchase.id}/edit`)}>
                  <Pencil aria-hidden size={14} className="me-1" /> {t('common.edit')}
                </Button>
                <Button
                  onClick={() => setConfirmReceive(true)}
                  disabled={unresolved.length > 0}
                  title={unresolved.length > 0 ? t('purchases.unresolvedWarning').replace('{count}', String(unresolved.length)) : ''}
                  className="cursor-pointer transition-colors duration-150"
                  style={{ background: 'var(--mod-raseed)' }}
                >
                  <PackageCheck aria-hidden size={14} className="me-1" /> {t('purchases.receiveStock')}
                </Button>
                <Button variant="ghost" aria-label={t('common.delete')}
                  className="cursor-pointer transition-colors duration-150"
                  onClick={() => setConfirmDelete(true)}>
                  <Trash2 aria-hidden size={14} />
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* ── Identity banner ───────────────────────────────────────── */}
      <div className="flex items-center gap-4 p-4 bg-surface-card rounded-xl border border-border">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-xl"
          style={{ width: 44, height: 44, background: 'color-mix(in srgb, var(--mod-raseed) 14%, var(--surface-card))', color: 'var(--mod-raseed)' }}
        >
          <TruckIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <h2 className="text-base font-bold text-gray-900">{purchase.supplierName}</h2>
            <PurchaseStatusBadge status={purchase.status} />
          </div>
          <p className="text-xs text-gray-400 font-mono">
            {purchase.invoiceNumber
              ? t('purchases.invoiceMeta').replace('{invoice}', purchase.invoiceNumber).replace('{date}', formatDate(purchase.invoiceDate))
              : formatDate(purchase.invoiceDate)}
          </p>
        </div>
        <div className="text-end flex-shrink-0">
          <p className="text-xs text-gray-400 mb-0.5">{t('col.total')}</p>
          <p className="text-xl font-bold tabular-nums font-mono">JOD {purchase.total.toFixed(2)}</p>
        </div>
      </div>

      {/* ── Receive info banner ───────────────────────────────────── */}
      {isDraft && unresolved.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', color: 'var(--blue-700)' }}>
          <PackageCheck aria-hidden size={16} className="flex-shrink-0" />
          {t('purchases.receiveInfo').replace('{count}', String(purchase.lines.length))}
        </div>
      )}

      {/* ── Unresolved warning ────────────────────────────────────── */}
      {isDraft && unresolved.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--yellow-50)', border: '1px solid var(--yellow-100)', color: 'var(--yellow-700)' }}>
          <AlertTriangle aria-hidden size={16} className="flex-shrink-0" />
          {t('purchases.unresolvedWarning').replace('{count}', String(unresolved.length))}
        </div>
      )}

      {/* ── Line items ────────────────────────────────────────────── */}
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold text-gray-900">{t('purchases.lineItems')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-surface-page border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('col.item')}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">{t('col.barcodeSku')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">{t('col.qty')}</th>
                <th className="px-4 py-2.5 text-end text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">{t('col.unitCost')}</th>
                <th className="px-4 py-2.5 text-end text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">{t('col.tax')}</th>
                <th className="px-4 py-2.5 text-end text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">{t('col.lineTotal')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchase.lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-surface-page transition-colors duration-100">
                  <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{line.itemName}</div>
                    {!line.itemId && (
                      <span className="text-xs text-amber-600 font-medium">(unresolved)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="font-mono text-xs text-gray-400">{line.barcode || line.sku || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-medium">{line.quantity}</td>
                  <td className="px-4 py-3 text-end font-mono tabular-nums text-gray-700">{line.unitCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-end font-mono tabular-nums text-gray-500">{line.taxAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold text-gray-900">{line.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-5 py-4 border-t border-border flex flex-col items-end gap-2">
          <div className="flex items-center gap-10 text-sm text-gray-500">
            <span>{t('purchases.subtotal')}</span>
            <span className="font-mono tabular-nums w-28 text-end">JOD {purchase.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-10 text-sm text-gray-500">
            <span>{t('col.tax')}</span>
            <span className="font-mono tabular-nums w-28 text-end">JOD {purchase.taxTotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-10 text-base font-bold text-gray-900 pt-1 border-t border-border mt-1">
            <span>{t('col.total')}</span>
            <span className="font-mono tabular-nums w-28 text-end">JOD {purchase.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {purchase.notes && (
        <div className="bg-surface-card rounded-xl border border-border p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('col.notes')}</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{purchase.notes}</p>
        </div>
      )}

      {/* Invoices / receipts */}
      {purchase.documents && purchase.documents.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-border p-5">
          <DocumentList value={purchase.documents} label="Invoices / receipts" />
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmReceive}
        onOpenChange={setConfirmReceive}
        title={t('purchases.receiveConfirmTitle')}
        description={t('purchases.receiveConfirmDesc').replace('{count}', String(purchase.lines.length))}
        confirmLabel={t('purchases.receiveLabel')}
        variant="default"
        onConfirm={handleReceive}
        loading={receiveMut.isPending}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('purchases.deleteConfirmTitle')}
        description={t('purchases.deleteConfirmDesc')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
