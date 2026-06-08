'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Copy, Check, Download, FileImage, Loader2, FileText, Receipt } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ServiceJobInvoicePreview } from './ServiceJobInvoicePreview';
import { useGenerateServiceJobInvoice } from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import type { HarakaServiceJob } from '@/types';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import type { ServiceJobDocumentConfig } from '@/lib/modules/haraka/service-jobs/service-job-document-config';
import { DEFAULT_SERVICE_JOB_DOCUMENT_CONFIG } from '@/lib/modules/haraka/service-jobs/service-job-document-config';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';
import { cn } from '@/lib/utils/cn';

interface Props {
  open:           boolean;
  onOpenChange:   (v: boolean) => void;
  job:            HarakaServiceJob;
  orgSlug:        string;
  orgName:        string;
  tagline?:       string;
  taxNumber?:     string;
  receiptConfig?: ReceiptConfig;
  docConfig?:     ServiceJobDocumentConfig;
  currency?:      string;
}

type DocType = 'invoice' | 'receipt';

export function ServiceJobInvoiceDialog({
  open, onOpenChange, job, orgSlug, orgName,
  tagline = '', taxNumber = '',
  receiptConfig = DEFAULT_RECEIPT_CONFIG,
  docConfig = DEFAULT_SERVICE_JOB_DOCUMENT_CONFIG,
  currency = 'JOD',
}: Props) {
  const [type, setType]               = useState<DocType>('invoice');
  const [copiedLink, setCopiedLink]   = useState(false);
  const [capturing,  setCapturing]    = useState(false);
  const captureRef  = useRef<HTMLDivElement>(null);
  const generateMut = useGenerateServiceJobInvoice();
  const { t }       = useT();

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/service-job-invoice/${orgSlug}/${job.id}`
    : `/service-job-invoice/${orgSlug}/${job.id}`;

  async function ensureInvoiceNumber() {
    if (job.invoiceNumber) return job.invoiceNumber;
    if (job.status !== 'done') return null;
    try {
      const { invoiceNumber } = await generateMut.mutateAsync(job.id);
      return invoiceNumber;
    } catch { return null; }
  }

  async function handleCopyLink() {
    await ensureInvoiceNumber();
    await navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleDownloadPDF() {
    await ensureInvoiceNumber();
    window.open(publicUrl, '_blank');
  }

  async function handleScreenshot() {
    if (!captureRef.current) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(captureRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `invoice-${job.jobNumber}.png`;
      a.click();
    } catch { toast.error(t('common.somethingWentWrong')); }
    finally { setCapturing(false); }
  }

  const jobForDoc = {
    id:              job.id,
    jobNumber:       job.jobNumber,
    invoiceNumber:   job.invoiceNumber,
    serviceType:     job.serviceType,
    customerName:    job.customerName,
    customerPhone:   job.customerPhone,
    staffMemberName: job.staffMemberName,
    serviceAddress:  job.serviceAddress as Record<string, string | null> | null,
    items:           job.items.map((i) => ({
      name:           i.name,
      description:    i.description,
      quantity:       i.quantity,
      unitPrice:      i.unitPrice,
      discountAmount: i.discountAmount,
      lineTotal:      i.lineTotal,
    })),
    subtotal:        job.subtotal,
    discountAmount:  job.discountAmount,
    taxAmount:       job.taxAmount,
    total:           job.total,
    paymentStatus:   job.paymentStatus,
    amountPaid:      job.amountPaid,
    paymentMethod:   job.paymentMethod,
    scheduledAt:     job.scheduledAt ? (job.scheduledAt instanceof Date ? job.scheduledAt.toISOString() : String(job.scheduledAt)) : null,
    notes:           job.notes,
    createdAt:       job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {job.jobNumber}
            {job.invoiceNumber && <span className="text-gray-400 text-sm font-normal ms-2">({job.invoiceNumber})</span>}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {/* Type toggle */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface-page">
            <button type="button" onClick={() => setType('invoice')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', type === 'invoice' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              <FileText className="h-3.5 w-3.5" strokeWidth={1.75} /> {t('invoiceDialog.invoice')}
            </button>
            <button type="button" onClick={() => setType('receipt')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', type === 'receipt' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              <Receipt className="h-3.5 w-3.5" strokeWidth={1.75} /> {t('invoiceDialog.receipt')}
            </button>
          </div>

          {!job.invoiceNumber && job.status !== 'done' && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">
              {t('invoiceDialog.noInvoiceJobStatus')}
            </div>
          )}
          {!job.invoiceNumber && job.status === 'done' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 flex items-center justify-between">
              <span>{t('invoiceDialog.noInvoiceGenerate')}</span>
              <Button size="sm" variant="outline" className="ms-3 h-7 text-xs" onClick={ensureInvoiceNumber} disabled={generateMut.isPending}>
                {generateMut.isPending ? <Loader2 size={12} className="animate-spin" /> : t('invoiceDialog.generate')}
              </Button>
            </div>
          )}

          {/* Preview */}
          <div className="overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-gray-50 max-h-[52vh]">
            <div ref={captureRef} style={{ transform: 'scale(0.79)', transformOrigin: 'top left', width: '126.6%' }}>
              <ServiceJobInvoicePreview
                job={jobForDoc}
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} className="flex-1 gap-2 justify-center">
              <Download size={14} /> {t('invoiceDialog.openPdf')}
            </Button>
            <Button variant="outline" onClick={handleCopyLink} className="flex-1 gap-2 justify-center">
              {copiedLink ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copiedLink ? t('invoiceDialog.copied') : t('invoiceDialog.copyLink')}
            </Button>
            <Button variant="outline" onClick={handleScreenshot} disabled={capturing} className="flex-1 gap-2 justify-center">
              {capturing ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
              {t('invoiceDialog.screenshot')}
            </Button>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
