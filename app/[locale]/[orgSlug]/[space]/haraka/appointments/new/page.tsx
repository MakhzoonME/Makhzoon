'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { CustomerSelect, type SelectedCustomer } from '@/components/haraka/CustomerSelect';
import { StaffPicker } from '@/components/haraka/StaffPicker';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useCreateAppointment, useServices } from '@/hooks/haraka';
import { useModuleGuard, toast, useT } from '@/hooks/ui';
import { useOrgInfo, useActiveAddOns } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';

export default function NewAppointmentPage() {
  const { isAllowed } = useModuleGuard({
    featureKey: 'pos',
    harakaModule: 'appointments',
    moduleKey: 'haraka',
    permOp: 'appointmentsCreate',
  });
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  const { t } = useT();
  const createMut = useCreateAppointment();
  const activeAddOns = useActiveAddOns();
  const hasWorkers = activeAddOns.deliveryAgents;

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const currency = orgInfo?.currency ?? 'JOD';

  // Only services an admin has explicitly marked bookable appear here.
  const { data: servicesData } = useServices({
    active: true,
    appointmentBookable: true,
    pageSize: 100,
  });
  const services = useMemo(() => servicesData?.items ?? [], [servicesData]);
  const serviceOptions: ComboboxOption[] = useMemo(
    () =>
      services.map((s) => ({
        value: s.id,
        label: s.durationMinutes ? `${s.name} — ${s.durationMinutes} min` : s.name,
      })),
    [services],
  );

  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState(() => new Date().toISOString());
  const [duration, setDuration] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');

  if (!isAllowed) return null;

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  // Blank means "use the catalog duration" — shown as a placeholder so the
  // receptionist can see what they'd get without typing anything.
  const effectiveDuration = duration.trim()
    ? Number(duration)
    : selectedService?.durationMinutes ?? null;

  async function handleSubmit() {
    const name = customer?.name || customerName.trim();
    if (!name) { toast.error(t('serviceJobs.errCustomerRequired')); return; }
    if (!serviceId) { toast.error(t('appointments.errServiceRequired')); return; }
    if (hasWorkers && !staffId) { toast.error(t('appointments.errProviderRequired')); return; }

    try {
      const res = await createMut.mutateAsync({
        customerId: customer?.id ?? null,
        customerName: name,
        customerPhone: customer?.phone || customerPhone.trim() || null,
        serviceId,
        staffId: hasWorkers ? staffId : null,
        scheduledAt,
        durationMinutes: duration.trim() ? Number(duration) : null,
        discountAmount: discount.trim() ? Number(discount) : null,
        notes: notes.trim() || null,
      });
      toast.success(res.appointment.appointmentNumber);
      router.push(`${base}/appointments/${res.appointment.id}`);
    } catch (err) {
      // The booking guard's message is specific (outside hours / slot taken) —
      // show it verbatim rather than a generic failure.
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={t('appointments.newTitle')}
        description={t('appointments.newSubtitle')}
        actions={
          <Button variant="ghost" onClick={() => router.push(`${base}/appointments`)}>
            <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
          </Button>
        }
      />

      {services.length === 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          {t('appointments.errNoBookableServices')}
        </div>
      )}

      {/* Customer */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('appointments.sectionCustomer')}
        </div>
        <CustomerSelect
          value={customer}
          onChange={(c) => {
            setCustomer(c);
            setCustomerName(c?.name ?? '');
            setCustomerPhone(c?.phone ?? '');
          }}
        />
        {!customer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                {t('serviceJobs.labelCustomerName')} *
              </label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('staff.labelPhone')}</label>
              <Input
                value={customerPhone}
                inputMode="tel"
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Booking */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('appointments.sectionBooking')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">
              {t('appointments.labelService')} *
            </label>
            <Combobox
              value={serviceId || null}
              onChange={(id) => setServiceId(id ?? '')}
              options={serviceOptions}
              placeholder={t('common.selectPlaceholder')}
              searchable
            />
          </div>

          {hasWorkers && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                {t('appointments.labelProvider')} *
              </label>
              <StaffPicker
                value={staffId}
                onChange={(id) => setStaffId(id)}
                capability="appointment_provider"
                emptyMessage={t('appointments.errNoProviders')}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">
              {t('appointments.labelScheduledAt')} *
            </label>
            <DateTimePicker value={scheduledAt} onChange={setScheduledAt} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">
              {t('appointments.labelDuration')}
            </label>
            <Input
              type="number"
              min="1"
              step="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder={selectedService?.durationMinutes ? String(selectedService.durationMinutes) : ''}
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">
              {t('appointments.labelDiscount')}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              className="font-mono"
            />
          </div>
        </div>

        {selectedService && (
          <div className="rounded-lg bg-surface-card border border-border p-3 text-sm flex items-center justify-between">
            <span className="text-gray-500">{t('appointments.labelPrice')}</span>
            <span className="font-mono font-semibold text-gray-800">
              {formatCurrency(selectedService.price, currency)}
              {effectiveDuration ? <span className="text-gray-400 font-normal"> · {effectiveDuration} min</span> : null}
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">{t('col.notes')}</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={createMut.isPending || services.length === 0}
          style={{ background: 'var(--mod-haraka)' }}
        >
          {createMut.isPending ? t('common.saving') : t('appointments.bookBtn')}
        </Button>
        <Button variant="outline" onClick={() => router.push(`${base}/appointments`)}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}
