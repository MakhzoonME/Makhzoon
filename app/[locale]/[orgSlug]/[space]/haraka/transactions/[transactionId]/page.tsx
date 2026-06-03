'use client';

import { use, useState } from 'react';
import { Ban, RotateCcw, Send, Printer, Share2, MessageCircle } from 'lucide-react';
import { PageHeader, StatusBadge, ConfirmDialog, SubscriptionGate, LoadingSkeleton } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTransaction, useVoidSale, useRefundSale, useResubmitFawtara } from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission } from '@/lib/permissions';
import { getReceiptBaseUrl } from '@/lib/app-env';
import type { PosTransaction } from '@/types';

interface Props {
  params: Promise<{ locale: string; orgSlug: string; space: string; transactionId: string }>;
}

function fmt(n: number) {
  return n.toFixed(2);
}

function fmtDate(d: Date | string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function TransactionDetailPage(props: Props) {
  const params = use(props.params);
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { user } = useAuthStore();
  const { data, isLoading } = useTransaction(params.transactionId);
  const voidMut = useVoidSale();
  const refundMut = useRefundSale();
  const resubmitMut = useResubmitFawtara();

  const [confirmVoid, setConfirmVoid] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);

  if (isLoading) return <LoadingSkeleton rows={6} columns={1} />;
  if (!data) return <div className="p-6">Transaction not found.</div>;

  const tx: PosTransaction = data.transaction;
  const isMutable = tx.status === 'completed';

  const shareUrl = `${getReceiptBaseUrl()}/r/${params.orgSlug}/${tx.id}`;
  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl).then(() => toast.success('Receipt link copied'));
  }
  function shareOnWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, '_blank');
  }
  const canVoid = !!user && hasPermission(user, 'pos', 'void_transaction');
  const canRefund = !!user && hasPermission(user, 'pos', 'issue_refund');
  const canResubmitFawtara = !!user && hasPermission(user, 'pos', 'fawtara_submit');

  async function doVoid() {
    try {
      await voidMut.mutateAsync(tx.id);
      toast.success('Transaction voided');
      setConfirmVoid(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Void failed');
    }
  }

  async function doRefund() {
    try {
      const res = await refundMut.mutateAsync({ id: tx.id });
      toast.success(`Refund created — ${res.refundTransactionId.slice(0, 8)}`);
      setConfirmRefund(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refund failed');
    }
  }

  async function doResubmit() {
    try {
      await resubmitMut.mutateAsync(tx.id);
      toast.success('Fawtara resubmission queued');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resubmit failed');
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <PageHeader
        title={`Receipt #${tx.receiptNumber}`}
        description={`Sold ${fmtDate(tx.createdAt)} by ${tx.cashierName}`}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: t('nav.transactions'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka/transactions` },
          { label: `#${tx.receiptNumber}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={tx.status} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer size={14} className="me-1" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={copyShareLink}>
              <Share2 size={14} className="me-1" /> Share
            </Button>
            <Button variant="outline" size="sm" onClick={shareOnWhatsApp}>
              <MessageCircle size={14} className="me-1" /> WhatsApp
            </Button>
            {isMutable && canRefund && (
              <SubscriptionGate>
                <Button variant="outline" size="sm" onClick={() => setConfirmRefund(true)}>
                  <RotateCcw size={14} className="me-1" /> Refund
                </Button>
              </SubscriptionGate>
            )}
            {isMutable && canVoid && (
              <SubscriptionGate>
                <Button variant="destructive" size="sm" onClick={() => setConfirmVoid(true)}>
                  <Ban size={14} className="me-1" /> Void
                </Button>
              </SubscriptionGate>
            )}
            {canResubmitFawtara && tx.fawtara && tx.fawtara.status !== 'submitted' && (
              <SubscriptionGate>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resubmitMut.isPending}
                  onClick={doResubmit}
                >
                  <Send size={14} className="me-1" />
                  {resubmitMut.isPending ? 'Resubmitting…' : 'Resubmit to Fawtara'}
                </Button>
              </SubscriptionGate>
            )}
          </div>
        }
      />

      {/* Voided / refunded state banner */}
      {tx.status === 'voided' && (
        <div className="rounded-xl border border-[var(--red-100)] bg-[var(--red-50)] px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">⊘</span>
          <div>
            <div className="text-sm font-bold text-[var(--red-700)]">This sale was voided</div>
            <div className="text-xs text-[var(--red-700)] opacity-80">
              {fmtDate(tx.updatedAt ?? tx.createdAt)}
            </div>
          </div>
        </div>
      )}
      {tx.status === 'refunded' && (
        <div className="rounded-xl border border-[var(--yellow-100)] bg-[var(--yellow-50)] px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">↩</span>
          <div>
            <div className="text-sm font-bold text-[var(--yellow-700)]">This sale was refunded</div>
            {tx.parentTransactionId && (
              <div className="text-xs text-[var(--yellow-700)] opacity-80 font-mono">
                Refund ref: {tx.parentTransactionId.slice(0, 8)}
              </div>
            )}
          </div>
        </div>
      )}

      {tx.customerId && (
        <Card>
          <CardContent className="p-4 text-sm">
            <span className="text-gray-500">Customer: </span>
            <span className="font-medium">{tx.customerName ?? tx.customerId}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-muted/40">
              <tr className="text-start">
                <th className="py-2 px-4 font-medium">Item</th>
                <th className="py-2 px-2 font-medium text-end">Qty</th>
                <th className="py-2 px-2 font-medium text-end">Unit</th>
                <th className="py-2 px-2 font-medium text-end">Tax</th>
                <th className="py-2 px-2 font-medium text-end">Disc.</th>
                <th className="py-2 px-4 font-medium text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              {tx.items.map((line, i) => (
                <tr key={`${line.inventoryItemId}-${i}`} className="border-b border-border last:border-0">
                  <td className="py-2 px-4">
                    <div className="font-medium">{line.inventoryItemName}</div>
                    {line.sku && <div className="text-xs text-gray-500">SKU: {line.sku}</div>}
                  </td>
                  <td className="py-2 px-2 text-end font-mono">{line.quantity}</td>
                  <td className="py-2 px-2 text-end font-mono">{fmt(line.unitPrice)}</td>
                  <td className="py-2 px-2 text-end font-mono">{fmt(line.taxAmount)}</td>
                  <td className="py-2 px-2 text-end font-mono">{fmt(line.discountAmount)}</td>
                  <td className="py-2 px-4 text-end font-mono">{fmt(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-1.5 text-sm">
            <Row label="Subtotal" value={fmt(tx.subtotal)} />
            <Row label="Discount" value={fmt(tx.discountAmount)} />
            <Row label="Tax" value={fmt(tx.taxAmount)} />
            <div className="border-t border-border my-2" />
            <div className="flex justify-between font-semibold">
              <span className="text-gray-500">Total</span>
              <span
                className="font-mono"
                style={
                  tx.status === 'voided'
                    ? { textDecoration: 'line-through', color: 'var(--text-tertiary)' }
                    : { color: 'var(--mod-haraka)' }
                }
              >
                JOD {fmt(tx.total)}
              </span>
            </div>
            <Row label="Change" value={fmt(tx.change)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="font-medium">Payments</div>
            {tx.payments.length === 0 ? (
              <div className="text-gray-500">—</div>
            ) : (
              tx.payments.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <span className="capitalize">
                    {p.method}
                    {p.cardLast4 ? ` •••• ${p.cardLast4}` : ''}
                  </span>
                  <span className="font-mono">{fmt(p.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {tx.fawtara && (
        <Card>
          <CardContent className="p-4 text-sm space-y-1.5">
            <div className="font-medium flex items-center gap-2">
              Fawtara (Jo-Fotara)
              <StatusBadge status={tx.fawtara.status} />
              {tx.status === 'voided' && tx.fawtara.status === 'submitted' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--yellow-100)] text-[var(--yellow-700)]">
                  Credit note sent
                </span>
              )}
            </div>
            <Row label="Invoice #" value={tx.fawtara.invoiceNumber ?? '—'} />
            <Row label="UUID" value={tx.fawtara.uuid ?? '—'} />
            <Row label="Submitted" value={fmtDate(tx.fawtara.submittedAt)} />
            <Row label="Attempts" value={String(tx.fawtara.attempts)} />
            {tx.fawtara.errorCode && (
              <Row label="Error" value={`${tx.fawtara.errorCode} — ${tx.fawtara.errorMessage ?? ''}`} />
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmVoid}
        onOpenChange={setConfirmVoid}
        title="Void this transaction?"
        description={
          <div className="space-y-3">
            <p>Stock will be returned and the sale removed from session totals. This can&apos;t be undone.</p>
            {tx.items.length > 0 && (
              <div className="rounded-lg bg-[var(--red-50)] border border-[var(--red-100)] px-3 py-2 text-xs text-[var(--red-700)] space-y-1">
                <div className="font-semibold mb-1">Items to restock:</div>
                {tx.items.map((item, i) => (
                  <div key={i}>{item.quantity}× {item.inventoryItemName}</div>
                ))}
              </div>
            )}
          </div>
        }
        confirmLabel="Void sale"
        onConfirm={doVoid}
        loading={voidMut.isPending}
      />
      <ConfirmDialog
        open={confirmRefund}
        onOpenChange={setConfirmRefund}
        title="Refund this transaction?"
        description="A new refund transaction will be created and the original marked refunded."
        confirmLabel="Refund"
        variant="default"
        onConfirm={doRefund}
        loading={refundMut.isPending}
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-500">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
