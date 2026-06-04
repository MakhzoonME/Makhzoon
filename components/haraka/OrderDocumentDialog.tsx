'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Copy, Check, Download, FileImage, Loader2, FileText, Receipt } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OrderDocumentPreview, type DocumentType } from '@/components/haraka/OrderDocumentPreview';
import { useAllocateInvoiceNumber, useOrderPayments } from '@/hooks/haraka';
import { toast } from '@/hooks/ui';
import type { HarakaOrder } from '@/types';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import type { OrderDocumentConfig } from '@/lib/modules/haraka/orders/order-document-config';
import { DEFAULT_ORDER_DOCUMENT_CONFIG } from '@/lib/modules/haraka/orders/order-document-config';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';
import { cn } from '@/lib/utils/cn';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: HarakaOrder;
  orgSlug: string;
  orgName: string;
  tagline?: string;
  taxNumber?: string;
  receiptConfig?: ReceiptConfig;
  docConfig?: OrderDocumentConfig;
  currency?: string;
  defaultType?: DocumentType;
}

export function OrderDocumentDialog({
  open, onOpenChange, order, orgSlug, orgName,
  tagline = '', taxNumber = '',
  receiptConfig = DEFAULT_RECEIPT_CONFIG,
  docConfig = DEFAULT_ORDER_DOCUMENT_CONFIG,
  currency = 'JOD',
  defaultType,
}: Props) {
  const isPaid = order.paymentStatus === 'paid';
  const [type, setType] = useState<DocumentType>(defaultType ?? (isPaid ? 'receipt' : 'invoice'));
  const [copiedLink, setCopiedLink] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const allocateMut = useAllocateInvoiceNumber();
  const { data: paymentsData } = useOrderPayments(order.id);
  const payments = (paymentsData?.payments ?? []).map((p) => ({
    id: p.id, amount: p.amount,
    paymentMethod: p.paymentMethod,
    note: p.note,
  }));

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/inv/${orgSlug}/${order.id}?type=${type}`
    : `/inv/${orgSlug}/${order.id}?type=${type}`;

  async function ensureInvoiceNumber() {
    if (order.invoiceNumber) return order.invoiceNumber;
    try {
      const { invoiceNumber } = await allocateMut.mutateAsync(order.id);
      return invoiceNumber;
    } catch {
      return null;
    }
  }

  async function handleCopyLink() {
    await ensureInvoiceNumber();
    await navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleDownloadPDF() {
    await ensureInvoiceNumber();
    window.open(`${publicUrl}&download=1`, '_blank');
  }

  async function handleScreenshot() {
    if (!captureRef.current) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(captureRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${type}-${order.orderNumber}.png`;
      a.click();
    } catch { toast.error('Screenshot failed'); }
    finally { setCapturing(false); }
  }

  const orderForDoc = {
    id:               order.id,
    orderNumber:      order.orderNumber,
    invoiceNumber:    order.invoiceNumber,
    channel:          order.channel,
    fulfillmentType:  order.fulfillmentType,
    customerName:     order.customerName,
    customerPhone:    order.customerPhone,
    deliveryAddress:  order.deliveryAddress as Record<string, string | null> | null,
    items:            order.items.map((i) => ({
      inventoryItemName: i.inventoryItemName,
      quantity:          i.quantity,
      unitPrice:         i.unitPrice,
      discountAmount:    i.discountAmount,
      lineTotal:         i.lineTotal,
    })),
    subtotal:         order.subtotal,
    discountAmount:   order.discountAmount,
    taxAmount:        order.taxAmount,
    total:            order.total,
    paymentStatus:    order.paymentStatus,
    amountPaid:       order.amountPaid,
    paymentMethod:    order.paymentMethod,
    salesAgentName:   order.salesAgentName,
    deliveryAgentName: order.deliveryAgentName,
    notes:            order.notes,
    scheduledAt:      order.scheduledAt?.toISOString() ?? null,
    createdAt:        order.createdAt.toISOString(),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {type === 'invoice' ? 'Invoice' : 'Receipt'} — {order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Type toggle */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface-page">
            <button
              type="button"
              onClick={() => setType('invoice')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', type === 'invoice' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700')}
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={1.75} /> Invoice
            </button>
            <button
              type="button"
              onClick={() => setType('receipt')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', type === 'receipt' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700')}
            >
              <Receipt className="h-3.5 w-3.5" strokeWidth={1.75} /> Receipt
            </button>
          </div>

          {/* Preview (scrollable) */}
          <div className="overflow-auto rounded-lg border border-border bg-gray-100 max-h-[52vh]">
            <div ref={captureRef} className="origin-top-left" style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '166.67%' }}>
              <OrderDocumentPreview
                type={type}
                order={orderForDoc}
                payments={payments}
                orgName={orgName}
                tagline={tagline}
                taxNumber={taxNumber}
                receiptConfig={receiptConfig}
                docConfig={docConfig}
                currency={currency}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={allocateMut.isPending} className="gap-2 justify-start">
              {allocateMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleCopyLink} className="gap-2 justify-start">
              {copiedLink ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button variant="outline" onClick={handleScreenshot} disabled={capturing} className="gap-2 justify-start">
              {capturing ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
              Screenshot
            </Button>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
