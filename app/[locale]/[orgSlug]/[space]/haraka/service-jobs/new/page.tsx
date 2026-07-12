'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { CustomerSelect } from '@/components/haraka/CustomerSelect';
import { ServiceLineEditor, type ServiceLineItem } from '@/components/haraka/ServiceLineEditor';
import { useCreateServiceJob } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAuthStore } from '@/store/auth.store';
import { hasPermByKey } from '@/lib/permissions';

export default function NewServiceJobPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed, isAdmin } = useAdminGuard(['pos.create_service_jobs', 'pos.checkout_service_jobs']);
  const { user } = useAuthStore();
  const canSetPricing = isAdmin || (!!user && hasPermByKey(user, 'pos.checkout_service_jobs'));
  const router = useRouter();
  const params  = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  const createMut = useCreateServiceJob();
  const { t } = useT();

  const currency = orgInfo?.currency ?? 'USD';
  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const [customerName,    setCustomerName]    = useState('');
  const [customerPhone,   setCustomerPhone]   = useState('');
  const [customerId,      setCustomerId]      = useState<string | null>(null);
  const [serviceType,     setServiceType]     = useState('');
  const [staffMemberName] = useState('');
  const [scheduledAt,     setScheduledAt]     = useState('');
  const [notes,           setNotes]           = useState('');
  const [lines, setLines] = useState<ServiceLineItem[]>([
    { name: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, discountAmount: 0 },
  ]);

  if (!featureAllowed || !isAllowed) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) { toast.error(t('serviceJobs.errCustomerRequired')); return; }
    const validLines = lines.filter((l) => l.name.trim() && l.unitPrice >= 0);
    if (validLines.length === 0) { toast.error(t('serviceJobs.errServiceRequired')); return; }

    try {
      const res = await createMut.mutateAsync({
        customerName:    customerName.trim(),
        customerPhone:   customerPhone.trim() || null,
        customerId:      customerId || null,
        serviceType:     serviceType || null,
        staffMemberName: staffMemberName.trim() || null,
        scheduledAt:     scheduledAt || null,
        notes:           notes.trim() || null,
        items:           validLines.map((l) => ({
          name:           l.name,
          description:    l.description || null,
          quantity:       l.quantity,
          unitPrice:      l.unitPrice,
          taxRate:        l.taxRate,
          discountAmount: l.discountAmount,
        })),
      } as Parameters<typeof createMut.mutateAsync>[0]);
      const jobData = res as { job?: { jobNumber?: string; id?: string } };
      toast.success(`${t('serviceJobs.newJob')} ${jobData.job?.jobNumber}`);
      router.push(`${base}/service-jobs/${jobData.job?.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={t('serviceJobs.newTitle')}
        description={t('serviceJobs.newSubtitle')}
        actions={
          <Button variant="ghost" onClick={() => router.push(`${base}/service-jobs`)}>
            <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{t('serviceJobs.sectionCustomer')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('serviceJobs.labelCustomerName')} *</label>
              <CustomerSelect
                value={customerId ? { id: customerId, name: customerName, phone: customerPhone || null } : null}
                onChange={(c) => {
                  setCustomerId(c?.id ?? null);
                  setCustomerName(c?.name ?? '');
                  setCustomerPhone(c?.phone ?? '');
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('col.phone')}</label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+962 7…" />
            </div>
          </div>
        </div>

        {/* Job details */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{t('serviceJobs.sectionJobDetails')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('serviceJobs.labelServiceType')}</label>
              <ConfigSelect
                listKey="service_job_type"
                value={serviceType}
                onValueChange={setServiceType}
                placeholder={t('common.selectPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('serviceJobs.labelScheduled')}</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('col.notes')}</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="…" />
          </div>
        </div>

        {/* Service lines */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{t('serviceJobs.sectionServices')}</h3>
          <ServiceLineEditor lines={lines} onChange={setLines} currency={currency} readOnlyPricing={!canSetPricing} />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`${base}/service-jobs`)} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createMut.isPending} className="flex-1" style={{ background: 'var(--mod-haraka)' }}>
            {createMut.isPending ? t('common.creating') : t('serviceJobs.createBtn')}
          </Button>
        </div>
      </form>
    </div>
  );
}
