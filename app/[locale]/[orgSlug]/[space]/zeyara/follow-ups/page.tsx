'use client';

// Who is due back. Reads zeyara_visits.follow_up_due — the same column the
// reminder sweep uses, so the screen and the WhatsApp message can never
// disagree about who is due.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Plus } from 'lucide-react';
import { PageHeader, DataTable } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { VerticalProvider, useVertical } from '@/components/vertical/VerticalProvider';
import { useFollowUps } from '@/hooks/zeyara';
import { useModuleGuard, useT } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';
import type { ZeyaraFollowUp } from '@/types';

function DueBadge({ days }: { days: number }) {
  const { t } = useT();
  const [label, color] =
    days < 0  ? [t('zeyara.overdueBy').replace('{n}', String(Math.abs(days))), '#ef4444']
    : days === 0 ? [t('zeyara.dueToday'), '#f97316']
    : [t('zeyara.dueInDays').replace('{n}', String(days)), '#6b7280'];
  return <span className="text-xs font-medium" style={{ color }}>{label}</span>;
}

function FollowUpsList() {
  const { featureKey, permModule, basePath, colorVar } = useVertical();
  const { isAllowed } = useModuleGuard({ featureKey, moduleKey: permModule, permOp: 'followUpsView' });
  const router = useRouter();
  const { t } = useT();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFollowUps({ page, pageSize: 50 });

  if (!isAllowed) return null;

  const columns: ColumnDef<ZeyaraFollowUp>[] = [
    {
      key: 'patientName',
      header: t('zeyara.colPatient'),
      render: (f) => <span className="text-sm font-medium text-gray-800">{f.patientName}</span>,
    },
    {
      key: 'followUpDue',
      header: t('zeyara.followUpDue'),
      render: (f) => (
        <div className="text-sm">
          <div className="text-gray-800">{formatDate(new Date(`${f.followUpDue}T00:00:00`))}</div>
          <DueBadge days={f.daysUntilDue} />
        </div>
      ),
    },
    {
      key: 'providerName',
      header: t('appointments.labelProvider'),
      render: (f) => <span className="text-sm text-gray-600">{f.providerName ?? '—'}</span>,
    },
    {
      key: 'lastVisitDate',
      header: t('zeyara.lastVisit'),
      render: (f) => (
        <span className="text-sm text-gray-600">
          {formatDate(f.lastVisitDate)}{' '}
          <span className="font-mono text-xs text-gray-400">{f.visitNumber}</span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (f) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              // Prefill the booking form with this patient.
              const q = f.customerId ? `?customerId=${f.customerId}` : '';
              router.push(`${basePath}/appointments/new${q}`);
            }}
          >
            <Plus className="h-3.5 w-3.5 me-1" strokeWidth={1.75} />
            {t('zeyara.bookFollowUp')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('zeyara.followUpsTitle')}
        description={t('zeyara.followUpsSubtitle')}
      />

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-page px-4 py-3">
        <CalendarClock className="h-4 w-4" strokeWidth={1.75} style={{ color: colorVar }} />
        <span className="text-sm text-gray-600">
          {t('zeyara.followUpsWindow').replace('{n}', String(data?.total ?? 0))}
        </span>
      </div>

      <DataTable<ZeyaraFollowUp>
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(f) => f.visitId}
        isLoading={isLoading}
        emptyMessage={t('zeyara.noFollowUps')}
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

export default function ZeyaraFollowUpsPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <FollowUpsList />
    </VerticalProvider>
  );
}
