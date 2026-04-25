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

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function SupportPage() {
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
      header: 'Subject',
      render: (t) => (
        <div>
          <p className="font-medium text-gray-900 line-clamp-1">{t.subject}</p>
          <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>
        </div>
      ),
    },
    {
      key: 'org',
      header: 'Organization',
      render: (t) => orgNameById.get(t.organizationId) ?? <span className="font-mono text-xs text-gray-500">{t.organizationId.slice(0, 8)}…</span>,
    },
    { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'created', header: 'Created', render: (t) => formatDate(new Date(t.createdAt)) },
    {
      key: 'actions',
      header: '',
      render: (t) => (
        <Button size="sm" variant="ghost" onClick={() => router.push(`/super-admin/support/${t.id}`)}>
          View
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
      <PageHeader title="Support Tickets" description="Review and respond to tickets across all organizations." />

      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 mb-4">
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
        >
          <option value="">All organizations</option>
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
          <option value="">Any status</option>
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
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {(orgId || status || priority) && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={tickets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No tickets match the current filters."
          keyExtractor={(t) => t.id}
        />
      </div>
    </div>
  );
}
