'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerSelect } from '@/components/haraka/CustomerSelect';
import { ServicePicker } from '@/components/haraka/ServicePicker';
import { Combobox } from '@/components/ui/combobox';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useCreateRetainer } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast, useT } from '@/hooks/ui';
import type { HarakaService } from '@/types';

export default function NewRetainerPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', harakaModule: 'retainers', moduleKey: 'haraka' });
  const { isAllowed } = useAdminGuard('pos.manage_retainers');
  const router    = useRouter();
  const params    = useParams<{ locale: string; orgSlug: string; space: string }>();
  const createMut = useCreateRetainer();
  const { t }     = useT();

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const [name,           setName]           = useState('');
  const [customerName,   setCustomerName]   = useState('');
  const [customerPhone,  setCustomerPhone]  = useState('');
  const [customerId,     setCustomerId]     = useState<string | null>(null);
  const [billingCycle,   setBillingCycle]   = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [amountPerCycle, setAmountPerCycle] = useState('');
  const [startDate,      setStartDate]      = useState(new Date().toISOString().slice(0, 10));
  const [endDate,        setEndDate]        = useState('');
  const [notes,          setNotes]          = useState('');

  if (!featureAllowed || !isAllowed) return null;

  function applyServicePick(service: HarakaService) {
    setAmountPerCycle(String(service.price));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim())         { toast.error(t('retainers.errNameRequired'));   return; }
    if (!customerName.trim()) { toast.error(t('retainers.errClientRequired')); return; }
    const amount = parseFloat(amountPerCycle);
    if (isNaN(amount) || amount <= 0) { toast.error(t('retainers.errAmountRequired')); return; }

    try {
      const result = await createMut.mutateAsync({
        name:           name.trim(),
        customerName:   customerName.trim(),
        customerPhone:  customerPhone.trim() || undefined,
        customerId:     customerId || undefined,
        billingCycle,
        amountPerCycle: amount,
        startDate,
        endDate:        endDate || undefined,
        notes:          notes.trim() || undefined,
      });
      const r = result as { retainer?: { retainerNumber?: string; id?: string } };
      toast.success(`${t('retainers.newRetainer')} ${r.retainer?.retainerNumber}`);
      router.push(`${base}/retainers/${r.retainer?.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={t('retainers.newTitle')}
        description={t('retainers.newSubtitle')}
        actions={
          <Button variant="ghost" onClick={() => router.push(`${base}/retainers`)}>
            <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contract */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{t('retainers.sectionContract')}</h3>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('retainers.labelContractName')} *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('col.notes')}</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="…" />
          </div>
        </div>

        {/* Client */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{t('retainers.sectionClient')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('retainers.labelClientName')} *</label>
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

        {/* Billing */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{t('retainers.sectionBilling')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('retainers.labelBillingCycle')} *</label>
              <Combobox
                value={billingCycle}
                onChange={(v) => setBillingCycle((v ?? 'monthly') as typeof billingCycle)}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'annual', label: 'Annual' },
                ]}
                searchable={false}
                clearable={false}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('retainers.labelAmountPerCycle')} *</label>
              <div className="flex gap-2">
                <Input
                  type="number" min="0" step="0.001"
                  value={amountPerCycle} onChange={(e) => setAmountPerCycle(e.target.value)}
                  placeholder="0.000" className="font-mono"
                />
                <ServicePicker onPick={applyServicePick} label={t('serviceLine.pickFromCatalog')} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('retainers.labelStartDate')} * / {t('retainers.labelEndDate')}</label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: s, endDate: e }) => { setStartDate(s); setEndDate(e); }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`${base}/retainers`)} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createMut.isPending} className="flex-1" style={{ background: 'var(--mod-haraka)' }}>
            {createMut.isPending ? t('common.creating') : t('retainers.createBtn')}
          </Button>
        </div>
      </form>
    </div>
  );
}
