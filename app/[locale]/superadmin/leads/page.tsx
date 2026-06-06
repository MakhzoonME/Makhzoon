'use client';
import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { useLeads, useDeleteLead, EarlyAccessLead, ContactSalesLead } from '@/hooks/superadmin/useLeads';
import { InviteLeadModal } from '@/components/super-admin/InviteLeadModal';
import { formatDate } from '@/lib/utils/date';
import { useT, toast } from '@/hooks/ui';

type Tab = 'early-access' | 'contact-sales';

function InviteSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrashSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M5.5 6v4M8.5 6v4M3 3.5l.667 7.333A.667.667 0 0 0 4.333 11.5h5.334a.667.667 0 0 0 .666-.667L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function LeadsPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('early-access');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const { data, isLoading } = useLeads();
  const deleteLead = useDeleteLead();

  const earlyAccess = data?.earlyAccess ?? [];
  const contactSales = data?.contactSales ?? [];

  async function handleDelete(id: string, type: 'early-access' | 'contact-sales') {
    if (!confirm(t('leads.confirmDelete'))) return;
    try {
      await deleteLead.mutateAsync({ id, type });
      toast.success(t('leads.deleted'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.deleteFailed'));
    }
  }

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const paginatedEarlyAccess = useMemo(() => {
    return earlyAccess.slice(0, page * pageSize);
  }, [earlyAccess, page, pageSize]);

  const paginatedContactSales = useMemo(() => {
    return contactSales.slice(0, page * pageSize);
  }, [contactSales, page, pageSize]);

  const hasMore = tab === 'early-access'
    ? earlyAccess.length > page * pageSize
    : contactSales.length > page * pageSize;

  function openInvite(email: string, name?: string) {
    setInviteEmail(email);
    setInviteName(name ?? '');
    setInviteOpen(true);
  }

  const eaColumns: ColumnDef<EarlyAccessLead>[] = [
    {
      key: 'email',
      header: t('leads.email'),
      render: (entry) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900">{entry.email}</span>
          <div className="ms-auto flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => openInvite(entry.email, [entry.firstName, entry.lastName].filter(Boolean).join(' ') || undefined)}
              className="p-1.5 rounded-md text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
              title={t('leads.inviteToOrg')}
            >
              <InviteSVG />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(entry.id, 'early-access')}
              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              title={t('common.delete')}
            >
              <TrashSVG />
            </button>
          </div>
        </div>
      ),
    },
    {
      key: 'firstName',
      header: t('leads.name'),
      render: (entry) => {
        const fullName = [entry.firstName, entry.lastName].filter(Boolean).join(' ') || '—';
        return (
          <span className="text-sm text-gray-700">{fullName}</span>
        );
      },
    },
    {
      key: 'ip',
      header: t('leads.ipAddress'),
      render: (entry) => (
        <span className="text-sm text-gray-500 font-mono text-xs">{entry.ip ?? '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('leads.submitted'),
      sortable: true,
      render: (entry) => (
        <span className="text-sm text-gray-500 tabular-nums">{formatDate(new Date(entry.createdAt))}</span>
      ),
    },
  ];

  const csColumns: ColumnDef<ContactSalesLead>[] = [
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
        <span className="text-sm text-gray-700">{entry.organizationName}</span>
      ),
    },
    {
      key: 'phone',
      header: t('leads.phone'),
      render: (entry) => (
        <span className="text-sm text-gray-500">{entry.phone}</span>
      ),
    },
    {
      key: 'notes',
      header: t('leads.notes'),
      render: (entry) => (
        <span className="text-sm text-gray-500 line-clamp-1 max-w-[200px]">{entry.notes || '—'}</span>
      ),
    },
    {
      key: 'invite',
      header: '',
      render: (entry) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={() => openInvite(entry.email, [entry.firstName, entry.lastName].filter(Boolean).join(' ') || entry.name)}
            className="p-1.5 rounded-md text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
            title={t('leads.inviteToOrg')}
          >
            <InviteSVG />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(entry.id, 'contact-sales')}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title={t('common.delete')}
          >
            <TrashSVG />
          </button>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: t('leads.submitted'),
      sortable: true,
      render: (entry) => (
        <span className="text-sm text-gray-500 tabular-nums">{formatDate(new Date(entry.createdAt))}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.leads')}
        description={t('leads.description')}
        breadcrumb={[{ label: t('nav.leads') }]}
        actions={
          tab === 'contact-sales' && contactSales.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => openInvite(contactSales[0].email, contactSales[0].name)}>
              <InviteSVG />
              {t('leads.inviteToOrg')}
            </Button>
          ) : tab === 'early-access' && earlyAccess.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => openInvite(earlyAccess[0].email)}>
              <InviteSVG />
              {t('leads.inviteToOrg')}
            </Button>
          ) : undefined
        }
      />

      <div className="border-b border-border mb-6">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setTab('early-access')}
            className={`py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'early-access'
                ? 'border-primary-600 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('leads.earlyAccessTab')}
            {earlyAccess.length > 0 && (
              <span className="ms-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-[11px] font-semibold tabular-nums">
                {earlyAccess.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('contact-sales')}
            className={`py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'contact-sales'
                ? 'border-primary-600 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('leads.contactSalesTab')}
            {contactSales.length > 0 && (
              <span className="ms-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-[11px] font-semibold tabular-nums">
                {contactSales.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      <div className="bg-surface-card rounded-lg border border-border">
        {tab === 'early-access' ? (
          <DataTable
            data={paginatedEarlyAccess}
            columns={eaColumns}
            isLoading={isLoading}
            emptyMessage={t('leads.noEarlyAccess')}
            keyExtractor={(entry) => entry.id}
          />
        ) : (
          <DataTable
            data={paginatedContactSales}
            columns={csColumns}
            isLoading={isLoading}
            emptyMessage={t('leads.noContactSales')}
            keyExtractor={(entry) => entry.id}
          />
        )}
        {hasMore && (
          <div className="flex justify-center py-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
              Load More ({(tab === 'early-access' ? earlyAccess.length : contactSales.length) - page * pageSize} remaining)
            </Button>
          </div>
        )}
      </div>

      <InviteLeadModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        leadEmail={inviteEmail}
        leadName={inviteName}
      />
    </div>
  );
}