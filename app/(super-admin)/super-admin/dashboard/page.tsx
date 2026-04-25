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
          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboardPage() {
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
      header: 'Organization',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.organization.name}</p>
          <p className="text-xs text-gray-500">{r.organization.subdomain}</p>
        </div>
      ),
    },
    {
      key: 'package',
      header: 'Package',
      render: (r) => (
        <span className="text-sm">{r.package?.name ?? <span className="text-gray-400">—</span>}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.subscription ? <StatusBadge status={r.subscription.status} /> : <span className="text-gray-400">—</span>,
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (r) => {
        if (!r.subscription) return <span className="text-gray-400">—</span>;
        const d = daysUntil(r.subscription.endDate);
        const tone = d < 0 ? 'text-red-600' : d <= 14 ? 'text-amber-600' : 'text-gray-600';
        return (
          <div>
            <p className="text-sm">{formatDate(new Date(r.subscription.endDate))}</p>
            <p className={`text-xs ${tone}`}>
              {d < 0 ? `${Math.abs(d)}d overdue` : `${d}d remaining`}
            </p>
          </div>
        );
      },
    },
    {
      key: 'assets',
      header: 'Assets',
      render: (r) => <UsageBar label="" current={r.usage.assets} max={r.package?.limits.maxAssets ?? -1} />,
    },
    {
      key: 'users',
      header: 'Users',
      render: (r) => <UsageBar label="" current={r.usage.users} max={r.package?.limits.maxUsers ?? -1} />,
    },
    {
      key: 'actions',
      header: 'Actions',
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
            <ArrowRight className="h-3.5 w-3.5 mr-1" /> Enter
          </Button>
          <Link href={`/super-admin/organizations/${r.organization.id}/edit`}>
            <Button size="sm" variant="ghost">Edit</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform-wide usage, subscriptions, and support state." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Organizations" value={stats.totalOrgs} icon={Building2} tone="indigo" />
        <StatCard label="Active Subscriptions" value={stats.activeSubs} icon={BadgeCheck} tone="green" />
        <StatCard label="Expiring (30d)" value={stats.expiringSoon} icon={AlertTriangle} tone="amber" />
        <StatCard label="Open Tickets" value={stats.openTickets} icon={MessageSquare} tone="red" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={rows}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No organizations yet."
          keyExtractor={(r) => r.organization.id}
        />
      </div>
    </div>
  );
}
