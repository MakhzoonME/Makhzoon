'use client';

// Zeyara clinic overview — deliberately NOT a copy of the Haraka dashboard,
// which is POS-centric (cash sessions, register, drawer). A clinic's home
// screen is the day's schedule.
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Users, Plus, Stethoscope, Banknote } from 'lucide-react';
import { PageHeader, StatCard, OverviewSection, DataTable } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { AppointmentStatusBadge } from '@/components/haraka/AppointmentStatusBadge';
import { VerticalProvider, useVertical } from '@/components/vertical/VerticalProvider';
import { useAppointments } from '@/hooks/haraka';
import { useCustomers } from '@/hooks/haraka';
import { useModuleGuard, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';
import { formatDateTime } from '@/lib/utils/date';
import type { HarakaAppointment } from '@/types';

function ZeyaraOverview() {
  const { featureKey, permModule, basePath, colorVar } = useVertical();
  const { isAllowed } = useModuleGuard({ featureKey, moduleKey: permModule });
  const router = useRouter();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const currency = orgInfo?.currency ?? 'JOD';

  // Half-open [startOfToday, startOfTomorrow) — matches the range semantics the
  // appointments API already uses for the calendar.
  const { from, to } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }, []);

  const { data: today, isLoading } = useAppointments({ from, to, pageSize: 100 });
  const { data: patients } = useCustomers({ page: 1, pageSize: 1 });

  if (!isAllowed) return null;

  const items = today?.items ?? [];
  const revenueToday = items
    .filter((a) => a.paymentStatus !== 'unpaid')
    .reduce((sum, a) => sum + (a.amountPaid ?? 0), 0);
  const upcoming = items.filter(
    (a) => a.status === 'scheduled' || a.status === 'confirmed',
  ).length;

  const columns: ColumnDef<HarakaAppointment>[] = [
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
      header: t('zeyara.colPatient'),
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('zeyara.overviewTitle')}
        description={t('zeyara.overviewSubtitle')}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('zeyara.statTodayAppointments')}
          value={String(items.length)}
          icon={<CalendarDays className="h-4 w-4" strokeWidth={1.75} />}
          iconBg="var(--surface-inset)"
          iconColor={colorVar}
          loading={isLoading}
        />
        <StatCard
          label={t('zeyara.statUpcoming')}
          value={String(upcoming)}
          icon={<Stethoscope className="h-4 w-4" strokeWidth={1.75} />}
          iconBg="var(--surface-inset)"
          iconColor={colorVar}
          loading={isLoading}
        />
        <StatCard
          label={t('zeyara.statCollectedToday')}
          value={formatCurrency(revenueToday, currency)}
          icon={<Banknote className="h-4 w-4" strokeWidth={1.75} />}
          iconBg="var(--surface-inset)"
          iconColor={colorVar}
          loading={isLoading}
        />
        <StatCard
          label={t('zeyara.statPatients')}
          value={String(patients?.total ?? 0)}
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
          iconBg="var(--surface-inset)"
          iconColor={colorVar}
          onClick={() => router.push(`${basePath}/patients`)}
        />
      </div>

      <OverviewSection
        title={t('zeyara.todaySchedule')}
        actionLabel={t('dashboard.viewAll')}
        onAction={() => router.push(`${basePath}/appointments`)}
        padded={false}
      >
        <DataTable<HarakaAppointment>
          columns={columns}
          data={items}
          keyExtractor={(a) => a.id}
          isLoading={isLoading}
          emptyMessage={t('zeyara.noAppointmentsToday')}
          onRowClick={(a) => router.push(`${basePath}/appointments/${a.id}`)}
        />
      </OverviewSection>
    </div>
  );
}

export default function ZeyaraOverviewPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <ZeyaraOverview />
    </VerticalProvider>
  );
}
