'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ReceptionTicketForm, type ReceptionTicketFormValues } from '@/components/haraka/ReceptionTicketForm';
import { useCreateReceptionTicket } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';

export default function NewReceptionTicketPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'reception', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.manage_reception');
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  const createMut = useCreateReceptionTicket();
  const { t } = useT();

  if (!featureAllowed || !isAllowed) return null;

  const currency = orgInfo?.currency ?? 'USD';
  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  async function handleSubmit(values: ReceptionTicketFormValues) {
    try {
      const { ticket } = await createMut.mutateAsync({
        customerName:  values.customerName.trim(),
        customerPhone: values.customerPhone.trim() || null,
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
      });
      toast.success(`${t('reception.created')} ${ticket.ticketNumber}`);
      router.push(`${base}/reception`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={t('reception.newTitle')}
        description={t('reception.newSubtitle')}
        actions={
          <Button variant="ghost" onClick={() => router.push(`${base}/reception`)}>
            <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
          </Button>
        }
      />
      <ReceptionTicketForm
        currency={currency}
        submitting={createMut.isPending}
        submitLabel={t('reception.createBtn')}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`${base}/reception`)}
      />
    </div>
  );
}
