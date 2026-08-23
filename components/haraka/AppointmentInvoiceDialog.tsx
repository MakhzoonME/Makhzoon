'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import { formatDateTime } from '@/lib/utils/date';
import type { HarakaAppointment } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: HarakaAppointment;
  currency?: string;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={strong ? 'text-sm font-semibold' : 'text-sm'}>{value}</span>
    </div>
  );
}

export function AppointmentInvoiceDialog({ open, onOpenChange, appointment, currency = 'JOD' }: Props) {
  const { t } = useT();
  const remaining = appointment.total - appointment.amountPaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('appointments.viewInvoice')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-1">
          <Row label={t('appointments.labelScheduledAt')} value={formatDateTime(appointment.scheduledAt)} />
          <div className="border-t border-border my-2" />
          <Row label={t('appointments.sectionCustomer')} value={appointment.customerName} />
          {appointment.serviceName && <Row label={t('appointments.labelService')} value={appointment.serviceName} />}
          {appointment.staffName && <Row label={t('appointments.labelProvider')} value={appointment.staffName} />}
          <div className="border-t border-border my-2" />
          <Row label={t('appointments.labelPrice')} value={formatCurrency(appointment.price, currency)} />
          {appointment.taxAmount > 0 && (
            <Row label={t('invoicePreview.tax')} value={formatCurrency(appointment.taxAmount, currency)} />
          )}
          <Row label={t('invoicePreview.total')} value={formatCurrency(appointment.total, currency)} strong />
          <Row label={t('haraka.amountPaid')} value={formatCurrency(appointment.amountPaid, currency)} />
          {remaining > 0.001 && (
            <Row label={t('invoicePreview.balanceDue')} value={formatCurrency(remaining, currency)} strong />
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
