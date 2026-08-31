'use client';
import { useVertical } from '@/components/vertical/VerticalProvider';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { AppointmentStatusBadge } from '@/components/haraka/AppointmentStatusBadge';
import { AppointmentInvoiceDialog } from '@/components/haraka/AppointmentInvoiceDialog';
import { AppointmentPaymentsPanel } from '@/components/haraka/AppointmentPaymentsPanel';
import { AppointmentProductsPanel } from '@/components/haraka/AppointmentProductsPanel';
import { ReportGenerateDrawer } from '@/components/document-reports/ReportGenerateDrawer';
import {
  useAppointment,
  useUpdateAppointment,
  useUpdateAppointmentStatus,
  useGenerateAppointmentInvoice,
} from '@/hooks/haraka';
import { useList } from '@/hooks/lists';
import { useModuleGuard, toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAuthStore } from '@/store/auth.store';
import { hasPermByKey } from '@/lib/permissions';
import { formatCurrency } from '@/lib/utils/format';
import { formatDateTime } from '@/lib/utils/date';
import type { AppointmentStatus } from '@/types';

// The 4 built-in status codes each carry their own permission (see
// requireStatusChange in appointments.service.ts); any status an org added
// beyond the platform defaults falls back to the general update permission.
function permOpForStatus(status: AppointmentStatus): string {
  return status === 'confirmed' ? 'appointmentsConfirm'
    : status === 'completed' ? 'appointmentsComplete'
    : status === 'cancelled' ? 'appointmentsCancel'
    : status === 'no_show'   ? 'appointmentsMarkNoShow'
    : 'appointmentsUpdate';
}

export function AppointmentDetailPage() {
  const { featureKey, permModule, basePath, customersSegment, colorVar } = useVertical();
  const { isAllowed } = useModuleGuard({
    featureKey,
    harakaModule: 'appointments',
    moduleKey: permModule,
    permOp: 'appointmentsView',
  });
  const params = useParams<{ locale: string; orgSlug: string; space: string; appointmentId: string }>();
  const router = useRouter();
  const { t, locale } = useT();
  const isAr = locale === 'ar';
  const { data: orgInfo } = useOrgInfo();
  const { user } = useAuthStore();

  const { data, isLoading } = useAppointment(params.appointmentId);
  const { data: statusList = [] } = useList('appointment_status');
  const updateStatus = useUpdateAppointmentStatus();
  const updateAppointment = useUpdateAppointment();
  const generateInvoice = useGenerateAppointmentInvoice();

  const [rescheduling, setRescheduling] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  if (!isAllowed) return null;

  const isAdmin = !!user && ['admin', 'org_owner', 'super_admin'].includes(user.role);
  // Resolves against the ACTIVE vertical's namespace.
  const can = (op: string) => isAdmin || (!!user && hasPermByKey(user, `${permModule}.${op}`));

  const currency = orgInfo?.currency ?? 'JOD';
  const base = basePath;
  const appointment = data?.appointment;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!appointment) return <div className="text-sm text-gray-400 p-6">{t('common.noResults')}</div>;

  const currentStatusItem = statusList.find((s) => s.value === appointment.status);
  // Falls back to the platform-default codes until the org's list resolves,
  // so the page isn't fully blocked on that request.
  const terminal = currentStatusItem
    ? currentStatusItem.isTerminal
    : appointment.status === 'cancelled' || appointment.status === 'no_show' || appointment.status === 'completed';
  const isInvoicingStatus = currentStatusItem
    ? currentStatusItem.isInvoicingTrigger
    : appointment.status === 'completed';
  const otherStatuses = statusList.filter((s) => s.value !== appointment.status);
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

  async function handleDiscountSave() {
    if (!appointment) return;
    const discountAmount = discountInput.trim() ? Number(discountInput) : 0;
    if (Number.isNaN(discountAmount) || discountAmount < 0) {
      toast.error(t('appointments.errInvalidDiscount'));
      return;
    }
    try {
      await updateAppointment.mutateAsync({ id: appointment.id, body: { discountAmount } });
      toast.success(t('common.updated'));
      setEditingDiscount(false);
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
            {isInvoicingStatus &&
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
            {/* Document Reports is cross-vertical — the add-on is the gate, and
                the report opens on whichever surface generated it. */}
            {appointment.customerId && user?.activeAddOns?.documentReports && hasPermByKey(user, 'documentReports.reportsCreate') && (
              <Button variant="outline" onClick={() => setReportDrawerOpen(true)}>
                <FileText className="h-4 w-4 me-2" /> Generate Report
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
            {otherStatuses.map((s) => (
              can(permOpForStatus(s.value)) && (
                <Button
                  key={s.value}
                  size="sm"
                  variant="outline"
                  style={{ color: s.color ?? undefined, borderColor: s.color ? `${s.color}40` : undefined }}
                  onClick={() => changeStatus(s.value, isAr ? s.labelAr || s.label : s.label)}
                  disabled={updateStatus.isPending}
                >
                  {isAr ? s.labelAr || s.label : s.label}
                </Button>
              )
            ))}
          </div>
        </div>

        {statusList.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {statusList.map((s) => {
              const current = s.value === appointment.status;
              return (
                <div
                  key={s.value}
                  className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors"
                  style={
                    current
                      ? { background: s.color ?? colorVar, color: '#fff' }
                      : { background: `${s.color ?? '#9ca3af'}18`, color: s.color ?? '#9ca3af' }
                  }
                >
                  {isAr ? s.labelAr || s.label : s.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t('appointments.sectionCustomer')}
            </div>
            {appointment.customerId && can('customersView') ? (
              <Link
                href={`${basePath}/${customersSegment}/${appointment.customerId}`}
                className="flex items-center justify-between gap-3 -m-1 p-1 rounded-lg transition-colors hover:bg-surface-hover"
              >
                <div>
                  <div className="font-medium text-gray-800">{appointment.customerName}</div>
                  {appointment.customerPhone && (
                    <div className="text-sm text-gray-500 mt-0.5">{appointment.customerPhone}</div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 rtl:rotate-180" />
              </Link>
            ) : (
              <div>
                <div className="font-medium text-gray-800">{appointment.customerName}</div>
                {appointment.customerPhone && (
                  <div className="text-sm text-gray-500 mt-0.5">{appointment.customerPhone}</div>
                )}
              </div>
            )}
          </div>

          <AppointmentProductsPanel
            appointment={appointment}
            currency={currency}
            readOnly={!can('appointmentsAddProduct')}
          />

          <AppointmentPaymentsPanel
            appointment={appointment}
            currency={currency}
            readOnly={!can('appointmentsAddPayment')}
            canEditDiscount={!terminal && can('appointmentsUpdate')}
          />

          {appointment.customerId && (
            <ReportGenerateDrawer
              open={reportDrawerOpen}
              onOpenChange={setReportDrawerOpen}
              customerId={appointment.customerId}
              encounterType="appointment"
              encounterId={appointment.id}
              onCreated={(report) => router.push(`${basePath}/reports/${report.id}`)}
            />
          )}

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

              <div className="flex justify-between items-center text-gray-500">
                <span>{t('appointments.labelDiscount')}</span>
                {!editingDiscount ? (
                  <button
                    type="button"
                    disabled={terminal || !can('appointmentsUpdate')}
                    onClick={() => {
                      setDiscountInput(appointment.discountAmount ? String(appointment.discountAmount) : '');
                      setEditingDiscount(true);
                    }}
                    className="font-mono text-gray-500 hover:text-primary-600 disabled:hover:text-gray-500 disabled:cursor-default"
                  >
                    {appointment.discountAmount > 0
                      ? `− ${formatCurrency(appointment.discountAmount, currency)}`
                      : '—'}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      autoFocus
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="h-7 w-24 font-mono text-end"
                    />
                    <Button size="sm" className="h-7 px-2" onClick={handleDiscountSave} disabled={updateAppointment.isPending}>
                      {t('common.save')}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingDiscount(false)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                )}
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
                      style={{ background: colorVar }}
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

      {invoiceOpen && (
        <AppointmentInvoiceDialog
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          appointment={appointment}
          orgSlug={params.orgSlug}
          orgName={orgInfo?.name ?? ''}
          currency={currency}
        />
      )}
    </div>
  );
}
