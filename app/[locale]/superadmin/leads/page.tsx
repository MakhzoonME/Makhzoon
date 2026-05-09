'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { useLeads, EarlyAccessLead, ContactSalesLead } from '@/hooks/superadmin/useLeads';
import { formatDate } from '@/lib/utils/date';
import { useT } from '@/hooks/ui';

type Tab = 'early-access' | 'contact-sales';

export default function LeadsPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('early-access');
  // Fetch both lists together — the API returns { earlyAccess, contactSales }
  // when called without a `type` param. Tab counts need both arrays anyway.
  const { data, isLoading } = useLeads();

  const earlyAccess = (data as { earlyAccess?: EarlyAccessLead[] } | undefined)?.earlyAccess ?? [];
  const contactSales = (data as { contactSales?: ContactSalesLead[] } | undefined)?.contactSales ?? [];

  const eaColumns: ColumnDef<EarlyAccessLead>[] = [
    {
      key: 'email',
      header: t('leads.email'),
      render: (entry) => (
        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{entry.email}</span>
      ),
    },
    {
      key: 'ip',
      header: t('leads.ipAddress'),
      render: (entry) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">{entry.ip ?? '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('leads.submitted'),
      sortable: true,
      render: (entry) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{formatDate(new Date(entry.createdAt))}</span>
      ),
    },
  ];

  const csColumns: ColumnDef<ContactSalesLead>[] = [
    {
      key: 'name',
      header: t('leads.name'),
      render: (entry) => (
        <div>
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{entry.name}</p>
          <p className="text-xs text-gray-500">{entry.email}</p>
        </div>
      ),
    },
    {
      key: 'organizationName',
      header: t('leads.organization'),
      render: (entry) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{entry.organizationName}</span>
      ),
    },
    {
      key: 'phone',
      header: t('leads.phone'),
      render: (entry) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">{entry.phone}</span>
      ),
    },
    {
      key: 'notes',
      header: t('leads.notes'),
      render: (entry) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[200px]">{entry.notes || '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('leads.submitted'),
      sortable: true,
      render: (entry) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{formatDate(new Date(entry.createdAt))}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t('nav.leads')} description={t('leads.description')} />

      <div className="border-b border-border mb-6">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setTab('early-access')}
            className={`py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'early-access'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('leads.earlyAccessTab')}
            {earlyAccess.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-[11px] font-semibold tabular-nums">
                {earlyAccess.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('contact-sales')}
            className={`py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'contact-sales'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('leads.contactSalesTab')}
            {contactSales.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-[11px] font-semibold tabular-nums">
                {contactSales.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      <div className="bg-surface-card rounded-lg border border-border">
        {tab === 'early-access' ? (
          <DataTable
            data={earlyAccess}
            columns={eaColumns}
            isLoading={isLoading}
            emptyMessage={t('leads.noEarlyAccess')}
            keyExtractor={(entry) => entry.id}
          />
        ) : (
          <DataTable
            data={contactSales}
            columns={csColumns}
            isLoading={isLoading}
            emptyMessage={t('leads.noContactSales')}
            keyExtractor={(entry) => entry.id}
          />
        )}
      </div>
    </div>
  );
}
