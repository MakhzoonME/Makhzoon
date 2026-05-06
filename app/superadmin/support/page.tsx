'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useAllOrgsUsage } from '@/hooks/useAllOrgsUsage';
import { formatDate } from '@/lib/utils/date';
import type { SupportTicket, TicketStatus, TicketPriority } from '@/types';
import { useT } from '@/hooks/useT';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function SupportPage() {
  const { t } = useT();
  const router = useRouter();
  const [orgId, setOrgId] = useState<string>('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');

  const filters = {
    orgId: orgId || undefined,
    status: (status || undefined) as TicketStatus | undefined,
    priority: (priority || undefined) as TicketPriority | undefined,
  };
  const { data: tickets = [], isLoading } = useSupportTickets(filters);
  const { data: orgs = [] } = useAllOrgsUsage();

  const orgNameById = useMemo(() => {
    return new Map(orgs.map((r) => [r.organization.id, r.organization.name]));
  }, [orgs]);

  const columns: ColumnDef<SupportTicket>[] = [
    {
      key: 'subject',
      header: t('support.subject'),
      render: (ticket) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{ticket.subject}</p>
          <p className="text-xs text-gray-500 dark:text-gray-300 line-clamp-1">{ticket.description}</p>
        </div>
      ),
    },
    {
      key: 'org',
      header: t('auditLogs.organization'),
      render: (ticket) => orgNameById.get(ticket.organizationId) ?? <span className="font-mono text-xs text-gray-500">{ticket.organizationId.slice(0, 8)}…</span>,
    },
    { key: 'priority', header: t('support.priority'), render: (ticket) => <StatusBadge status={ticket.priority} /> },
    { key: 'status', header: t('support.status'), render: (ticket) => <StatusBadge status={ticket.status} /> },
    { key: 'created', header: t('support.created'), render: (ticket) => formatDate(new Date(ticket.createdAt)) },
    {
      key: 'actions',
      header: '',
      render: (ticket) => (
        <Button size="sm" variant="ghost" onClick={() => router.push(`/superadmin/support/${ticket.id}`)}>
          {t('support.view')}
        </Button>
      ),
    },
  ];

  const clearFilters = () => {
    setOrgId('');
    setStatus('');
    setPriority('');
  };

  return (
    <div>
      <PageHeader title={t('nav.support')} description={t('support.description2')} />

      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 mb-4">
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
        >
          <option value="">{t('support.allOrgs')}</option>
          {orgs.map((r) => (
            <option key={r.organization.id} value={r.organization.id}>
              {r.organization.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus | '')}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
        >
          <option value="">{t('support.anyStatus')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TicketPriority | '')}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
        >
          <option value="">{t('support.anyPriority')}</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {(orgId || status || priority) && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            {t('orgs.clear')}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={tickets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('support.noMatch')}
          keyExtractor={(ticket) => ticket.id}
        />
      </div>
    </div>
  );
}
