'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { Building2, BadgeCheck, AlertTriangle, MessageSquare, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UsageBar } from '@/components/shared/UsageBar';
import { useAllOrgsUsage } from '@/hooks/useAllOrgsUsage';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useTransferMode } from '@/hooks/useTransferMode';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/date';
import type { OrgWithUsage } from '@/types';
import { useT } from '@/hooks/useT';

function daysUntil(d: Date | string): number {
  const target = typeof d === 'string' ? new Date(d) : d;
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'indigo' | 'green' | 'amber' | 'red';
}

const TONES: Record<NonNullable<StatCardProps['tone']>, string> = {
  indigo: 'bg-indigo-50 text-indigo-700',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};

function StatCard({ label, value, icon: Icon, tone = 'indigo' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide dark:text-gray-300">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboardPage() {
  const { t } = useT();
  const { data: rows = [], isLoading } = useAllOrgsUsage();
  const { data: openTickets = [] } = useSupportTickets({ status: 'OPEN' });
  const { enterTransferMode } = useTransferMode();

  const stats = useMemo(() => {
    const totalOrgs = rows.length;
    const activeSubs = rows.filter((r) => r.subscription?.status === 'ACTIVE').length;
    const expiringSoon = rows.filter((r) => {
      if (!r.subscription) return false;
      const d = daysUntil(r.subscription.endDate);
      return d >= 0 && d <= 30;
    }).length;
    return { totalOrgs, activeSubs, expiringSoon, openTickets: openTickets.length };
  }, [rows, openTickets]);

  const columns: ColumnDef<OrgWithUsage>[] = [
    {
      key: 'name',
      header: t('superDash.organization'),
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{r.organization.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-300">{r.organization.subdomain}</p>
        </div>
      ),
    },
    {
      key: 'package',
      header: t('superDash.package'),
      render: (r) => (
        <span className="text-sm">{r.package?.name ?? <span className="text-gray-400">—</span>}</span>
      ),
    },
    {
      key: 'status',
      header: t('superDash.status'),
      render: (r) =>
        r.subscription ? <StatusBadge status={r.subscription.status} /> : <span className="text-gray-400">—</span>,
    },
    {
      key: 'endDate',
      header: t('superDash.endDate'),
      render: (r) => {
        if (!r.subscription) return <span className="text-gray-400">—</span>;
        const d = daysUntil(r.subscription.endDate);
        const tone = d < 0 ? 'text-red-600' : d <= 14 ? 'text-amber-600' : 'text-gray-600';
        return (
          <div>
            <p className="text-sm">{formatDate(new Date(r.subscription.endDate))}</p>
            <p className={`text-xs ${tone}`}>
              {d < 0
                ? t('superDash.dOverdue').replace('{days}', String(Math.abs(d)))
                : t('superDash.dRemaining').replace('{days}', String(d))}
            </p>
          </div>
        );
      },
    },
    {
      key: 'assets',
      header: t('superDash.assets'),
      render: (r) => <UsageBar label="" current={r.usage.assets} max={r.package?.limits.maxAssets ?? -1} />,
    },
    {
      key: 'users',
      header: t('superDash.users'),
      render: (r) => <UsageBar label="" current={r.usage.users} max={r.package?.limits.maxUsers ?? -1} />,
    },
    {
      key: 'actions',
      header: t('superDash.actions'),
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              enterTransferMode(r.organization.id, r.organization.name);
            }}
          >
            <ArrowRight className="h-3.5 w-3.5 mr-1" /> {t('superDash.enter')}
          </Button>
          <Link href={`/superadmin/organizations/${r.organization.id}/edit`}>
            <Button size="sm" variant="ghost">{t('superDash.edit')}</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t('nav.dashboard')} description={t('superDash.description')} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label={t('superDash.totalOrgs')} value={stats.totalOrgs} icon={Building2} tone="indigo" />
        <StatCard label={t('superDash.activeSubs')} value={stats.activeSubs} icon={BadgeCheck} tone="green" />
        <StatCard label={t('superDash.expiring')} value={stats.expiringSoon} icon={AlertTriangle} tone="amber" />
        <StatCard label={t('superDash.openTickets')} value={stats.openTickets} icon={MessageSquare} tone="red" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={rows}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('superDash.noOrgs')}
          keyExtractor={(r) => r.organization.id}
        />
      </div>
    </div>
  );
}
