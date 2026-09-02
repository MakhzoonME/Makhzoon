'use client';

// Clinic dashboard — "today's schedule" per
// docs/plans/2026-08-31-zeyara-rebuild-design.md §1. Unlike most Zeyara
// routes this isn't a thin shell over a Haraka page body: Haraka's own root
// page is POS/session-focused (open register, today's sales), which has no
// clinic equivalent, so this is a small appointment-focused dashboard of its
// own, styled with the Zeyara brand color.
import { useRouter } from 'next/navigation';
import { startOfDay, endOfDay } from 'date-fns';
import { CalendarClock, Users, ClipboardList, Plus, ArrowRight } from 'lucide-react';
import { useOrgSlug, useSpace, useT, useModuleGuard } from '@/hooks/ui';
import { PageHeader, StatCard, OverviewSection, DataTable } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { AppointmentStatusBadge } from '@/components/haraka/AppointmentStatusBadge';
import { formatDateTime } from '@/lib/utils/date';
import { useAppointments, useCustomers, useServices } from '@/hooks/haraka';
import type { HarakaAppointment } from '@/types';

export default function ZeyaraOverviewPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'zeyara', moduleKey: 'zeyara' });
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  const base = `/${locale}/${orgSlug}/${space}/zeyara`;

  const now = new Date();
  const range = { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };

  const { data: todayAppts, isLoading: todayLoading } = useAppointments({ ...range, pageSize: 50 });
  const { data: upcoming, isLoading: upcomingLoading } = useAppointments({ from: range.from, pageSize: 5 });
  const { data: patients, isLoading: patientsLoading } = useCustomers({ pageSize: 1 });
  const { data: services, isLoading: servicesLoading } = useServices();

  if (!isAllowed) return null;

  const todayCount = todayAppts?.total ?? 0;
  const patientCount = patients?.total ?? 0;
  const serviceCount = services?.items?.length ?? 0;
  const upcomingList = upcoming?.items ?? [];

  const columns: ColumnDef<HarakaAppointment>[] = [
    {
      key: 'appointmentNumber',
      header: t('col.appointment'),
      render: (a) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-zeyara)' }}>
          {a.appointmentNumber}
        </span>
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
    { key: 'serviceName', header: t('col.service'), render: (a) => a.serviceName ?? '—' },
    { key: 'scheduledAt', header: t('col.date'), render: (a) => formatDateTime(a.scheduledAt) },
    { key: 'status', header: t('col.status'), render: (a) => <AppointmentStatusBadge status={a.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.zeyara')}
        description={t('overview.zeyara.subtitle')}
        actions={
          <Button size="sm" style={{ background: 'var(--mod-zeyara)' }} onClick={() => router.push(`${base}/appointments/new`)}>
            <Plus className="h-4 w-4 me-1" strokeWidth={1.75} />
            {t('appointments.newAppointment')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<CalendarClock className="w-[18px] h-[18px]" />}
          iconBg="rgba(15,118,110,0.08)" iconColor="var(--mod-zeyara)"
          label={t('overview.todaysAppointments')}
          value={todayCount}
          loading={todayLoading}
          onClick={() => router.push(`${base}/appointments`)}
        />
        <StatCard
          icon={<Users className="w-[18px] h-[18px]" />}
          iconBg="var(--blue-50)" iconColor="var(--blue-700)"
          label={t('overview.customers')}
          value={patientCount}
          loading={patientsLoading}
          onClick={() => router.push(`${base}/patients`)}
        />
        <StatCard
          icon={<ClipboardList className="w-[18px] h-[18px]" />}
          iconBg="var(--yellow-50)" iconColor="var(--yellow-700)"
          label={t('services.title')}
          value={serviceCount}
          loading={servicesLoading}
          onClick={() => router.push(`${base}/services`)}
        />
      </div>

      <OverviewSection
        title={t('overview.upcomingAppointments')}
        actionLabel={t('dashboard.viewAll')}
        onAction={() => router.push(`${base}/appointments/calendar`)}
        padded={false}
      >
        <DataTable
          data={upcomingList}
          columns={columns}
          isLoading={upcomingLoading}
          emptyMessage={t('appointments.noAppointments')}
          onRowClick={(a) => router.push(`${base}/appointments/${a.id}`)}
          keyExtractor={(a) => a.id}
        />
      </OverviewSection>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => router.push(`${base}/appointments/calendar`)}>
          {t('appointments.calendar')} <ArrowRight className="h-4 w-4 ms-1" />
        </Button>
      </div>
    </div>
  );
}
