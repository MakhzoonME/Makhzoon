'use client';

// Shared appointments list, rendered by /haraka/appointments. Everything
// brand-specific comes from useVertical().
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CalendarDays } from 'lucide-react';
import { PageHeader, DataTable, FilterBar } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { AppointmentStatusBadge } from '@/components/haraka/AppointmentStatusBadge';
import { StaffPicker } from '@/components/haraka/StaffPicker';
import { useVertical } from '@/components/vertical/VerticalProvider';
import { useAppointments } from '@/hooks/haraka';
import { useModuleGuard, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';
import { formatDateTime } from '@/lib/utils/date';
import type { HarakaAppointment } from '@/types';

export function AppointmentsListPage() {
  const { vertical, featureKey, permModule, basePath, colorVar } = useVertical();
  const { isAllowed } = useModuleGuard({
    featureKey,
    // Appointments is an à-la-carte sub-module INSIDE Haraka; Zeyara buys the
    // appointment engine as part of the vertical itself, so this gate only
    // applies on the Haraka surface.
    harakaModule: vertical === 'haraka' ? 'appointments' : undefined,
    moduleKey: permModule,
    permOp: 'appointmentsView',
  });
  const router = useRouter();
  const { data: orgInfo } = useOrgInfo();
  const { t } = useT();

  const [status, setStatus] = useState('all');
  const [staffId, setStaffId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAppointments({
    status: status === 'all' ? undefined : status,
    staffId: staffId ?? undefined,
    page,
    pageSize: 25,
  });

  if (!isAllowed) return null;

  const currency = orgInfo?.currency ?? 'JOD';

  const columns: ColumnDef<HarakaAppointment>[] = [
    {
      key: 'appointmentNumber',
      header: t('col.appointment'),
      render: (a) => (
        <span className="font-mono text-xs font-semibold" style={{ color: colorVar }}>
          {a.appointmentNumber}
        </span>
      ),
    },
    {
      key: 'scheduledAt',
      header: t('appointments.labelScheduledAt'),
      render: (a) => (
        <div className="text-sm">
          <div className="text-gray-800">{formatDateTime(a.scheduledAt)}</div>
          <div className="text-gray-400 text-xs">{a.durationMinutes} min</div>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: t('col.customer'),
      render: (a) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">{a.customerName}</div>
          {a.customerPhone && <div className="text-gray-400 text-xs">{a.customerPhone}</div>}
        </div>
      ),
    },
    {
      key: 'serviceName',
      header: t('appointments.labelService'),
      render: (a) => <span className="text-sm text-gray-600">{a.serviceName ?? '—'}</span>,
    },
    {
      key: 'staffName',
      header: t('appointments.labelProvider'),
      render: (a) => <span className="text-sm text-gray-600">{a.staffName ?? '—'}</span>,
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (a) => <AppointmentStatusBadge status={a.status} />,
    },
    {
      key: 'total',
      header: t('col.total'),
      render: (a) => (
        <span className="font-mono text-sm tabular-nums">{formatCurrency(a.total, currency)}</span>
      ),
    },
    {
      key: 'paymentStatus',
      header: t('col.payment'),
      render: (a) => {
        const color =
          a.paymentStatus === 'paid' ? '#22c55e'
          : a.paymentStatus === 'partial' ? '#f97316'
          : '#9ca3af';
        return <span className="text-xs font-medium capitalize" style={{ color }}>{a.paymentStatus}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('appointments.title')}
        description={t('appointments.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`${basePath}/appointments/calendar`)}>
              <CalendarDays className="h-4 w-4 me-2" strokeWidth={1.75} />
              {t('appointments.calendar')}
            </Button>
            <Button
              onClick={() => router.push(`${basePath}/appointments/new`)}
              style={{ background: colorVar }}
            >
              <Plus className="h-4 w-4 me-2" /> {t('appointments.newAppointment')}
            </Button>
          </div>
        }
      />

      <FilterBar
        filters={[
          <ConfigSelect
            key="status"
            listKey="appointment_status"
            value={status}
            onValueChange={(v) => { setStatus(v); setPage(1); }}
            includeAll
            allLabel={t('common.selectPlaceholder')}
            allValue="all"
            className="w-44"
          />,
          <div key="provider" className="w-56">
            <StaffPicker
              value={staffId}
              onChange={(id) => { setStaffId(id); setPage(1); }}
              capability="appointment_provider"
              placeholder={t('appointments.filterProvider')}
              emptyMessage={t('appointments.errNoProviders')}
            />
          </div>,
        ]}
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage={t('appointments.noAppointments')}
        onRowClick={(a) => router.push(`${basePath}/appointments/${a.id}`)}
        pagination={
          data && data.totalPages > 1
            ? {
                page: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPages: data.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
