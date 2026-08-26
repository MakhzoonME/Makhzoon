'use client';

import { useRef, useState } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { Copy, Check, Download, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppointmentInvoicePreview } from './AppointmentInvoicePreview';
import { toast, useT } from '@/hooks/ui';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';
import { getReceiptBaseUrl } from '@/lib/app-env';
import type { HarakaAppointment } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: HarakaAppointment;
  orgSlug: string;
  orgName: string;
  tagline?: string;
  taxNumber?: string;
  receiptConfig?: ReceiptConfig;
  currency?: string;
}

export function AppointmentInvoiceDialog({
  open, onOpenChange, appointment, orgSlug, orgName,
  tagline = '', taxNumber = '',
  receiptConfig = DEFAULT_RECEIPT_CONFIG,
  currency = 'JOD',
}: Props) {
  const { t } = useT();
  const [copiedLink, setCopiedLink] = useState(false);
  const [capturing, setCapturing] = useState<'png' | 'jpg' | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const publicUrl = `${getReceiptBaseUrl()}/appointment-invoice/${orgSlug}/${appointment.id}`;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleOpenPdf() {
    window.open(publicUrl, '_blank');
  }

  function handlePrint() {
    window.open(`${publicUrl}?print=1`, '_blank');
  }

  async function handleDownload(kind: 'png' | 'jpg') {
    if (!captureRef.current) return;
    setCapturing(kind);
    try {
      const dataUrl = kind === 'png'
        ? await toPng(captureRef.current, { pixelRatio: 2 })
        : await toJpeg(captureRef.current, { pixelRatio: 2, quality: 0.95 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `invoice-${appointment.appointmentNumber}.${kind}`;
      a.click();
    } catch {
      toast.error(t('common.somethingWentWrong'));
    } finally {
      setCapturing(null);
    }
  }

  const docAppointment = {
    id: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    invoiceNumber: appointment.invoiceNumber,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone,
    serviceName: appointment.serviceName ?? null,
    staffName: appointment.staffName ?? null,
    scheduledAt: appointment.scheduledAt instanceof Date ? appointment.scheduledAt.toISOString() : String(appointment.scheduledAt),
    durationMinutes: appointment.durationMinutes,
    price: appointment.price,
    taxAmount: appointment.taxAmount,
    total: appointment.total,
    paymentStatus: appointment.paymentStatus,
    amountPaid: appointment.amountPaid,
    notes: appointment.notes,
    createdAt: appointment.createdAt instanceof Date ? appointment.createdAt.toISOString() : String(appointment.createdAt),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {appointment.appointmentNumber}
            {appointment.invoiceNumber && <span className="text-gray-400 text-sm font-normal ms-2">({appointment.invoiceNumber})</span>}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <div className="overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-gray-50 max-h-[52vh]">
            <div ref={captureRef} style={{ transform: 'scale(0.79)', transformOrigin: 'top left', width: '126.6%' }}>
              <AppointmentInvoicePreview
                appointment={docAppointment}
                orgName={orgName}
                tagline={tagline}
                taxNumber={taxNumber}
                receiptConfig={receiptConfig}
                currency={currency}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleCopyLink} className="flex-1 gap-2 justify-center min-w-[45%]">
              {copiedLink ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copiedLink ? t('invoiceDialog.copied') : t('invoiceDialog.copyLink')}
            </Button>
            <Button variant="outline" onClick={handleOpenPdf} className="flex-1 gap-2 justify-center min-w-[45%]">
              <Download size={14} /> {t('invoiceDialog.openPdf')}
            </Button>
            <Button variant="outline" onClick={handlePrint} className="flex-1 gap-2 justify-center min-w-[45%]">
              <Printer size={14} /> {t('invoiceDialog.print')}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload('png')}
              disabled={capturing !== null}
              className="flex-1 gap-2 justify-center min-w-[45%]"
            >
              <Download size={14} /> {capturing === 'png' ? '…' : t('invoiceDialog.downloadPng')}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload('jpg')}
              disabled={capturing !== null}
              className="flex-1 gap-2 justify-center min-w-[45%]"
            >
              <Download size={14} /> {capturing === 'jpg' ? '…' : t('invoiceDialog.downloadJpg')}
            </Button>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
