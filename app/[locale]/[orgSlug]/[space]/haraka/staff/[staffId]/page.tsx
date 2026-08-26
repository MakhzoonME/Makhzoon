'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, Phone } from 'lucide-react';
import { PageHeader, DataTable } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { AppointmentStatusBadge } from '@/components/haraka/AppointmentStatusBadge';
import { ServiceJobStatusBadge } from '@/components/haraka/ServiceJobStatusBadge';
import { useStaff, useAppointments, useServiceJobs } from '@/hooks/haraka';
import { useModuleGuard, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';
import { formatDateTime } from '@/lib/utils/date';
import type { HarakaAppointment, HarakaServiceJob } from '@/types';

const PAGE_SIZE = 15;

export default function StaffDetailPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'haraka' });
  const params = useParams<{ locale: string; orgSlug: string; space: string; staffId: string }>();
  const router = useRouter();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const { data: staffData, isLoading: staffLoading } = useStaff();
  const person = (staffData?.items ?? []).find((s) => s.id === params.staffId) ?? null;

  const [apptPage, setApptPage] = useState(1);
  const [jobPage, setJobPage] = useState(1);
  const currency = orgInfo?.currency ?? 'JOD';

  const showAppointments = !!person?.capabilities.includes('appointment_provider');
  const showServiceJobs = !!person?.capabilities.includes('service_job');

  const { data: apptData, isLoading: apptLoading } = useAppointments(
    { staffId: params.staffId, page: apptPage, pageSize: PAGE_SIZE },
    showAppointments,
  );
  const { data: jobData, isLoading: jobLoading } = useServiceJobs({
    staffMemberId: params.staffId,
    page: jobPage,
    pageSize: PAGE_SIZE,
  });

  if (!isAllowed) return null;
  if (staffLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!person) {
    return (
      <div className="p-6">
        <PageHeader title={t('staff.notFound')} />
        <Button variant="outline" onClick={() => router.push(`${base}/staff`)}>
          <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
        </Button>
      </div>
    );
  }

  const appointmentColumns: ColumnDef<HarakaAppointment>[] = [
    {
      key: 'appointmentNumber',
      header: t('col.appointment'),
      render: (a) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
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
    { key: 'total', header: t('col.total'), render: (a) => formatCurrency(a.total, currency) },
  ];

  const jobColumns: ColumnDef<HarakaServiceJob>[] = [
    {
      key: 'jobNumber',
      header: t('col.job'),
      render: (j) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
          {j.jobNumber}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: t('col.customer'),
      render: (j) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">{j.customerName}</div>
          {j.customerPhone && <div className="text-gray-400 text-xs">{j.customerPhone}</div>}
        </div>
      ),
    },
    { key: 'status', header: t('col.status'), render: (j) => <ServiceJobStatusBadge status={j.status} /> },
    { key: 'createdAt', header: t('col.date'), render: (j) => formatDateTime(j.createdAt) },
    { key: 'total', header: t('col.total'), render: (j) => formatCurrency(j.total, currency) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={person.name}
        description={person.phone ?? undefined}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: 'Haraka', href: base },
          { label: t('staff.title'), href: `${base}/staff` },
          { label: person.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {person.capabilities.includes('appointment_provider') && (
              <Button variant="outline" onClick={() => router.push(`${base}/staff/${person.id}/availability`)}>
                <CalendarClock className="h-4 w-4 me-2" strokeWidth={1.75} />
                {t('staff.availability')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.push(`${base}/staff`)}>
              <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-surface-page p-5 flex flex-wrap items-center gap-4">
        {person.phone && (
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Phone className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} /> {person.phone}
          </span>
        )}
        <div className="flex flex-wrap gap-1">
          {person.capabilities.map((cap) => (
            <span
              key={cap}
              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-card text-gray-600 border border-border"
            >
              {cap === 'delivery' ? t('staff.capabilityDelivery')
                : cap === 'service_job' ? t('staff.capabilityServiceJob')
                : t('staff.capabilityAppointment')}
            </span>
          ))}
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            person.isActive ? 'bg-[var(--green-100)] text-[var(--green-700)]' : 'bg-surface-card text-gray-500'
          }`}
        >
          {person.isActive ? t('common.active') : t('common.inactive')}
        </span>
      </div>

      {showAppointments && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">{t('staff.jobsAppointments')}</h2>
          <DataTable<HarakaAppointment>
            columns={appointmentColumns}
            data={apptData?.items ?? []}
            keyExtractor={(a) => a.id}
            isLoading={apptLoading}
            emptyMessage={t('staff.jobsNone')}
            onRowClick={(a) => router.push(`${base}/appointments/${a.id}`)}
            pagination={{
              page: apptPage,
              pageSize: PAGE_SIZE,
              total: apptData?.total ?? 0,
              totalPages: apptData?.totalPages ?? 1,
              onPageChange: setApptPage,
            }}
          />
        </section>
      )}

      {showServiceJobs && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">{t('staff.jobsServiceJobs')}</h2>
          <DataTable<HarakaServiceJob>
            columns={jobColumns}
            data={jobData?.items ?? []}
            keyExtractor={(j) => j.id}
            isLoading={jobLoading}
            emptyMessage={t('staff.jobsNone')}
            onRowClick={(j) => router.push(`${base}/service-jobs/${j.id}`)}
            pagination={{
              page: jobPage,
              pageSize: PAGE_SIZE,
              total: jobData?.total ?? 0,
              totalPages: jobData?.totalPages ?? 1,
              onPageChange: setJobPage,
            }}
          />
        </section>
      )}

      {!showAppointments && !showServiceJobs && (
        <div className="rounded-xl border border-border bg-surface-page p-8 text-center text-sm text-gray-400">
          {t('staff.noJobCapabilities')}
        </div>
      )}
    </div>
  );
}
