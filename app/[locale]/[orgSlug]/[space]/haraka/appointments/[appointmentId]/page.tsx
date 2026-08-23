'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { AppointmentStatusBadge } from '@/components/haraka/AppointmentStatusBadge';
import { AppointmentInvoiceDialog } from '@/components/haraka/AppointmentInvoiceDialog';
import { AppointmentPaymentsPanel } from '@/components/haraka/AppointmentPaymentsPanel';
import {
  useAppointment,
  useUpdateAppointment,
  useUpdateAppointmentStatus,
  useGenerateAppointmentInvoice,
} from '@/hooks/haraka';
import { useModuleGuard, toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAuthStore } from '@/store/auth.store';
import { hasPermByKey } from '@/lib/permissions';
import { formatCurrency } from '@/lib/utils/format';
import { formatDateTime } from '@/lib/utils/date';
import type { AppointmentStatus } from '@/types';

// The happy path, rendered as a stepper. Cancelled / no_show are shown
// separately because they leave the flow rather than advancing it.
const STATUS_FLOW: AppointmentStatus[] = ['scheduled', 'confirmed', 'completed'];

export default function AppointmentDetailPage() {
  const { isAllowed } = useModuleGuard({
    featureKey: 'pos',
    harakaModule: 'appointments',
    moduleKey: 'haraka',
    permOp: 'appointmentsView',
  });
  const params = useParams<{ locale: string; orgSlug: string; space: string; appointmentId: string }>();
  const router = useRouter();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { user } = useAuthStore();

  const { data, isLoading } = useAppointment(params.appointmentId);
  const updateStatus = useUpdateAppointmentStatus();
  const updateAppointment = useUpdateAppointment();
  const generateInvoice = useGenerateAppointmentInvoice();

  const [rescheduling, setRescheduling] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  if (!isAllowed) return null;

  const isAdmin = !!user && ['admin', 'org_owner', 'super_admin'].includes(user.role);
  const can = (op: string) => isAdmin || (!!user && hasPermByKey(user, `haraka.${op}`));

  const currency = orgInfo?.currency ?? 'JOD';
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const appointment = data?.appointment;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!appointment) return <div className="text-sm text-gray-400 p-6">{t('common.noResults')}</div>;

  const currentIdx = STATUS_FLOW.indexOf(appointment.status);
  const terminal =
    appointment.status === 'cancelled' ||
    appointment.status === 'no_show' ||
    appointment.status === 'completed';
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentIdx + 1]
    : null;

  const canAdvance =
    !!nextStatus &&
    can(nextStatus === 'confirmed' ? 'appointmentsConfirm' : 'appointmentsComplete');
  // scheduledAt is typed as Date but arrives from the API as an ISO string;
  // new Date() normalizes both.
  const startsAt = new Date(appointment.scheduledAt);
  const endsAt = new Date(startsAt.getTime() + appointment.durationMinutes * 60_000);

  async function changeStatus(status: AppointmentStatus, successLabel: string) {
    if (!appointment) return;
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status });
      toast.success(successLabel);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  async function handleReschedule() {
    if (!appointment || !newTime) return;
    try {
      await updateAppointment.mutateAsync({ id: appointment.id, body: { scheduledAt: newTime } });
      toast.success(t('common.updated'));
      setRescheduling(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  async function handleInvoice() {
    if (!appointment) return;
    // Already invoiced — just show it, no need to hit the generate endpoint again.
    if (appointment.invoiceNumber) {
      setInvoiceOpen(true);
      return;
    }
    try {
      await generateInvoice.mutateAsync(appointment.id);
      toast.success(t('appointments.generateInvoice'));
      setInvoiceOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={appointment.appointmentNumber}
        description={`${t('appointments.title')}${appointment.serviceName ? ` — ${appointment.serviceName}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {appointment.status === 'completed' &&
              (appointment.invoiceNumber || can('appointmentsGenerateInvoice')) && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleInvoice}
                  disabled={generateInvoice.isPending}
                >
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                  {appointment.invoiceNumber
                    ? t('appointments.viewInvoice')
                    : t('appointments.generateInvoice')}
                </Button>
              )}
            <Button variant="ghost" onClick={() => router.push(`${base}/appointments`)}>
              <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
            </Button>
          </div>
        }
      />

      {/* Status */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AppointmentStatusBadge status={appointment.status} />
            {appointment.invoiceNumber && (
              <span className="text-xs text-gray-400 font-mono">{appointment.invoiceNumber}</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {canAdvance && nextStatus && (
              <Button
                size="sm"
                onClick={() =>
                  changeStatus(
                    nextStatus,
                    nextStatus === 'confirmed'
                      ? t('appointments.markConfirmed')
                      : t('appointments.markCompleted'),
                  )
                }
                disabled={updateStatus.isPending}
                style={{ background: 'var(--mod-haraka)' }}
              >
                {nextStatus === 'confirmed'
                  ? t('appointments.markConfirmed')
                  : t('appointments.markCompleted')}
              </Button>
            )}
            {!terminal && can('appointmentsMarkNoShow') && (
              <Button
                size="sm"
                variant="outline"
                className="text-orange-600 border-orange-200"
                onClick={() => changeStatus('no_show', t('appointments.markNoShow'))}
                disabled={updateStatus.isPending}
              >
                {t('appointments.markNoShow')}
              </Button>
            )}
            {!terminal && can('appointmentsCancel') && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-500 border-red-200"
                onClick={() => changeStatus('cancelled', t('appointments.markCancelled'))}
                disabled={updateStatus.isPending}
              >
                {t('appointments.markCancelled')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_FLOW.map((s, i) => {
            const done = currentIdx > i;
            const current = s === appointment.status;
            return (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                    current ? 'text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}
                  style={current ? { background: 'var(--mod-haraka)' } : undefined}
                >
                  {s}
                </div>
                {i < STATUS_FLOW.length - 1 && <div className="h-px w-4 bg-gray-200 flex-shrink-0" />}
              </div>
            );
          })}
          {(appointment.status === 'cancelled' || appointment.status === 'no_show') && (
            <div className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-600 ms-1">
              {appointment.status.replace('_', ' ')}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t('appointments.sectionCustomer')}
            </div>
            <div>
              <div className="font-medium text-gray-800">{appointment.customerName}</div>
              {appointment.customerPhone && (
                <div className="text-sm text-gray-500 mt-0.5">{appointment.customerPhone}</div>
              )}
            </div>
          </div>

          <AppointmentPaymentsPanel
            appointment={appointment}
            currency={currency}
            readOnly={!can('appointmentsAddPayment')}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t('appointments.sectionBooking')}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">{t('appointments.labelService')}</span>
                <span className="text-gray-800">{appointment.serviceName ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('appointments.labelProvider')}</span>
                <span className="text-gray-800">{appointment.staffName ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('appointments.labelScheduledAt')}</span>
                <span className="text-gray-800">{formatDateTime(appointment.scheduledAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('appointments.endsAt')}</span>
                <span className="text-gray-800">
                  {formatDateTime(endsAt)}
                  <span className="text-gray-400"> · {appointment.durationMinutes} min</span>
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-1 text-sm border-t border-border">
              <div className="flex justify-between text-gray-500">
                <span>{t('appointments.labelPrice')}</span>
                <span className="font-mono">{formatCurrency(appointment.price, currency)}</span>
              </div>
              {appointment.taxAmount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>{t('invoicePreview.tax')}</span>
                  <span className="font-mono">{formatCurrency(appointment.taxAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 border-t border-border pt-2">
                <span>{t('invoicePreview.total')}</span>
                <span className="font-mono">{formatCurrency(appointment.total, currency)}</span>
              </div>
            </div>

            {!terminal && can('appointmentsUpdate') && (
              !rescheduling ? (
                <button
                  type="button"
                  onClick={() => {
                    setRescheduling(true);
                    setNewTime(startsAt.toISOString());
                  }}
                  className="w-full text-xs text-primary-600 hover:text-primary-800 py-1 rounded-lg border border-dashed border-primary-200 hover:border-primary-400 transition-colors"
                >
                  {t('appointments.labelScheduledAt')}
                </button>
              ) : (
                <div className="space-y-2 pt-2 border-t border-border">
                  <DateTimePicker value={newTime} onChange={setNewTime} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setRescheduling(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleReschedule}
                      disabled={updateAppointment.isPending}
                      style={{ background: 'var(--mod-haraka)' }}
                    >
                      {updateAppointment.isPending ? t('common.saving') : t('common.saveChanges')}
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>

          {appointment.notes && (
            <div className="rounded-xl border border-border bg-surface-page p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {t('col.notes')}
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-line">{appointment.notes}</p>
            </div>
          )}
        </div>
      </div>

      <AppointmentInvoiceDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        appointment={appointment}
        currency={currency}
      />
    </div>
  );
}
