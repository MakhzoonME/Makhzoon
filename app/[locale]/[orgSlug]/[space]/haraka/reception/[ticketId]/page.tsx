'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ReceptionTicketForm, type ReceptionTicketFormValues } from '@/components/haraka/ReceptionTicketForm';
import { ServiceJobStatusBadge } from '@/components/haraka/ServiceJobStatusBadge';
import { TicketStatusBadge } from '@/components/haraka/TicketStatusBadge';
import {
  useReceptionTicket,
  useUpdateReceptionTicket,
  useCancelReceptionTicket,
} from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';

export default function ReceptionTicketPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'reception', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.view_reception');
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string; ticketId: string }>();
  const { data: orgInfo } = useOrgInfo();
  const { t } = useT();

  const { data, isLoading } = useReceptionTicket(params.ticketId);
  const updateMut = useUpdateReceptionTicket();
  const cancelMut = useCancelReceptionTicket();

  if (!featureAllowed || !isAllowed) return null;

  const currency = orgInfo?.currency ?? 'USD';
  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const ticket   = data?.ticket;

  async function handleSubmit(values: ReceptionTicketFormValues) {
    try {
      await updateMut.mutateAsync({
        id: params.ticketId,
        body: {
          customerName:  values.customerName.trim() || null,
          customerPhone: values.customerPhone.trim() || null,
          carPlate:      values.carPlate.trim() || null,
          customerId:    values.customerId || null,
          notes:         values.notes.trim() || null,
          items:         values.items,
          serviceItems:  values.serviceItems.map((l) => ({
            name:           l.name.trim(),
            description:    l.description.trim() || null,
            quantity:       l.quantity,
            unitPrice:      l.unitPrice,
            taxRate:        l.taxRate,
            discountAmount: l.discountAmount,
          })),
        },
      });
      toast.success(t('reception.updated'));
      router.push(`${base}/reception`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  async function handleCancel() {
    if (!confirm(t('reception.confirmCancel'))) return;
    try {
      await cancelMut.mutateAsync(params.ticketId);
      toast.success(t('reception.cancelled'));
      router.push(`${base}/reception`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  if (isLoading || !ticket) {
    return <div className="py-16 text-center text-sm text-gray-400">{t('common.loading')}</div>;
  }

  const initial: ReceptionTicketFormValues = {
    customerId:    ticket.customerId,
    customerName:  ticket.customerName,
    customerPhone: ticket.customerPhone ?? '',
    carPlate:      ticket.carPlate ?? '',
    notes:         ticket.notes ?? '',
    items: ticket.items.map((l) => ({
      itemId:    l.inventoryItemId,
      itemName:  l.inventoryItemName,
      sku:       l.sku,
      barcode:   l.barcode,
      quantity:  l.quantity,
      unitPrice: l.unitPrice,
      taxRateId: l.taxRateId,
      taxRate:   l.taxRate,
      discount:  l.discountAmount,
    })),
    serviceItems: (ticket.serviceJob?.items ?? []).map((l) => ({
      name:           l.name,
      description:    l.description ?? '',
      quantity:       l.quantity,
      unitPrice:      l.unitPrice,
      taxRate:        l.taxRate,
      discountAmount: l.discountAmount,
    })),
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`${t('reception.ticket')} ${ticket.ticketNumber}`}
        description={
          ticket.serviceJob
            ? `${t('reception.linkedJob')}: ${ticket.serviceJob.jobNumber}`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            {ticket.serviceJob && <ServiceJobStatusBadge status={ticket.serviceJob.status} />}
            {ticket.status === 'open' && (
              <Button variant="outline" onClick={handleCancel} disabled={cancelMut.isPending} className="text-red-600">
                <XCircle className="h-4 w-4 me-2" /> {t('reception.cancelTicket')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.push(`${base}/reception`)}>
              <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
            </Button>
          </div>
        }
      />

      {ticket.status === 'open' ? (
        <ReceptionTicketForm
          initial={initial}
          currency={currency}
          submitting={updateMut.isPending}
          submitLabel={t('common.save')}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`${base}/reception`)}
        />
      ) : (
        /* Settled tickets are read-only */
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <div className="text-sm">
            <div className="font-medium text-gray-800">{ticket.customerName}</div>
            <div className="text-gray-400 text-xs">
              {[ticket.customerPhone, ticket.carPlate].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="space-y-1">
            {ticket.items.map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{l.quantity} × {l.inventoryItemName}</span>
                <span className="font-mono tabular-nums">{formatCurrency(l.lineTotal, currency)}</span>
              </div>
            ))}
            {(ticket.serviceJob?.items ?? []).map((l, i) => (
              <div key={`s-${i}`} className="flex justify-between text-sm text-gray-600">
                <span>{l.quantity} × {l.name} <span className="text-xs text-gray-400">({t('reception.service')})</span></span>
                <span className="font-mono tabular-nums">{formatCurrency(l.lineTotal, currency)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-3 border-t border-border">
            <span className="text-sm font-semibold">{t('col.total')}</span>
            <span className="font-mono font-bold" style={{ color: 'var(--mod-haraka)' }}>
              {formatCurrency(ticket.grandTotal, currency)}
            </span>
          </div>
          {ticket.notes && <p className="text-xs text-gray-500">{ticket.notes}</p>}
        </div>
      )}
    </div>
  );
}
