'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { useMessages, useDeleteMessage, WebsiteMessage } from '@/hooks/superadmin/useMessages';
import { formatDate } from '@/lib/utils/date';
import { useT, toast } from '@/hooks/ui';

function TrashSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M5.5 6v4M8.5 6v4M3 3.5l.667 7.333A.667.667 0 0 0 4.333 11.5h5.334a.667.667 0 0 0 .666-.667L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronSVG({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WebsiteMessagesPage() {
  const { t } = useT();
  const { data, isLoading } = useMessages();
  const deleteMessage = useDeleteMessage();
  const [expanded, setExpanded] = useState<string | null>(null);

  const messages = data ?? [];

  async function handleDelete(id: string) {
    if (!confirm(t('websiteMessages.confirmDelete'))) return;
    try {
      await deleteMessage.mutateAsync(id);
      toast.success(t('websiteMessages.deleted'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.deleteFailed'));
    }
  }

  const columns: ColumnDef<WebsiteMessage>[] = [
    {
      key: 'name',
      header: t('leads.name'),
      render: (entry) => {
        const fullName = [entry.firstName, entry.lastName].filter(Boolean).join(' ') || entry.name;
        return (
          <div>
            <p className="font-medium text-sm text-gray-900">{fullName}</p>
            <p className="text-xs text-gray-500">{entry.email}</p>
          </div>
        );
      },
    },
    {
      key: 'organizationName',
      header: t('leads.organization'),
      render: (entry) => (
        <span className="text-sm text-gray-700">{entry.organizationName || '—'}</span>
      ),
    },
    {
      key: 'notes',
      header: t('websiteMessages.message'),
      render: (entry) => {
        const isOpen = expanded === entry.id;
        const notes = entry.notes ?? '';
        return (
          <div className="max-w-xs">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : entry.id)}
              className="flex items-center gap-1 text-sm text-gray-700 text-left hover:text-gray-900 transition-colors"
            >
              <span className={isOpen ? '' : 'line-clamp-1'}>{notes || '—'}</span>
              {notes && <ChevronSVG open={isOpen} />}
            </button>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: t('leads.submitted'),
      sortable: true,
      render: (entry) => (
        <span className="text-sm text-gray-500 tabular-nums">{formatDate(new Date(entry.createdAt))}</span>
      ),
    },
    {
      key: 'ip',
      header: t('leads.ipAddress'),
      render: (entry) => (
        <span className="text-xs text-gray-500 font-mono">{entry.ip ?? '—'}</span>
      ),
    },
    {
      key: 'id',
      header: '',
      render: (entry) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleDelete(entry.id)}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title={t('common.delete')}
          >
            <TrashSVG />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.websiteMessages')}
        description={t('websiteMessages.description')}
        breadcrumb={[{ label: t('nav.websiteMessages') }]}
      />

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={messages}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('websiteMessages.empty')}
          keyExtractor={(entry) => entry.id}
        />
      </div>
    </div>
  );
}
