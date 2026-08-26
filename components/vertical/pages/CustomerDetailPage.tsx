'use client';
import { useVertical } from '@/components/vertical/VerticalProvider';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2, ArrowRight, Copy, Receipt, ShoppingBag, FileText, ChevronRight, CalendarClock, Wrench } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, ConfirmDialog, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCustomer, useDeleteCustomer, useCustomerHistory, type CustomerHistoryEntry } from '@/hooks/haraka';
import { formatCurrency } from '@/lib/utils/format';
import { toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAuthStore } from '@/store/auth.store';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { MoveResourceDialog } from '@/components/spaces/MoveResourceDialog';
import { DuplicateResourceDialog } from '@/components/spaces/DuplicateResourceDialog';

export function CustomerDetailPage() {
  const { basePath, customersSegment, navLabelKey } = useVertical();
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string; customerId: string }>();
  const { data, isLoading } = useCustomer(params.customerId);
  const deleteMut = useDeleteCustomer();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [dupeOpen, setDupeOpen] = useState(false);
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'org_owner' || user?.role === 'super_admin';
  const { data: spaceList } = useAccessibleSpaces();
  const hasMultipleSpaces = (spaceList?.items?.length ?? 0) > 1;

  const base = `${basePath}/${customersSegment}`;
  const customer = data?.customer;

  async function onDelete() {
    try {
      await deleteMut.mutateAsync(params.customerId);
      toast.success('Customer deleted');
      router.replace(base);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <PageHeader title="Customer not found" />
        <Button variant="outline" onClick={() => router.push(base)}>
          Back to customers
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={customer.name}
        description="Customer details"
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t(navLabelKey), href: basePath },
          { label: t('customers.title'), href: base },
          { label: customer.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`${base}/${customer.id}/edit`)}>
              <Pencil size={14} className="me-1" /> Edit
            </Button>
            {hasMultipleSpaces && isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => setMoveOpen(true)}>
                  <ArrowRight size={14} className="me-1" /> {t('move.button')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDupeOpen(true)}>
                  <Copy size={14} className="me-1" /> {t('duplicate.button')}
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} className="me-1" /> Delete
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-surface-page p-6 space-y-4">
        <Field label="Name" value={customer.name} />
        <Field label="Phone" value={customer.phone ?? '—'} />
        <Field label="Email" value={customer.email ?? '—'} />
        <Field
          label="Notes"
          value={customer.notes ?? '—'}
          multiline
        />
        <div className="text-xs text-gray-500 pt-2 border-t border-border">
          Created {new Date(customer.createdAt).toLocaleString()} · Updated{' '}
          {new Date(customer.updatedAt).toLocaleString()}
        </div>
      </div>

      <CustomerHistorySection
        customerId={customer.id}
        harakaBase={`/${params.locale}/${params.orgSlug}/${params.space}/haraka`}
        currency={orgInfo?.currency}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete customer?"
        description={`"${customer.name}" will be removed. Past sales referencing this customer keep their snapshotted name.`}
        confirmLabel="Delete"
        onConfirm={onDelete}
        loading={deleteMut.isPending}
      />

      <MoveResourceDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        type="customer"
        ids={[customer.id]}
        recordLabel={customer.name}
        onMoved={() => router.replace(base)}
      />

      <DuplicateResourceDialog
        open={dupeOpen}
        onOpenChange={setDupeOpen}
        type="customer"
        ids={[customer.id]}
        recordLabel={customer.name}
      />
    </div>
  );
}

function CustomerHistorySection({
  customerId,
  harakaBase,
  currency,
}: {
  customerId: string;
  harakaBase: string;
  currency?: string;
}) {
  const { data, isLoading, isError } = useCustomerHistory(customerId);
  const entries = data?.entries ?? [];

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface-page">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold">Activity history</h2>
        {entries.length > 0 && (
          <span className="text-xs text-gray-500">{entries.length} record{entries.length === 1 ? '' : 's'}</span>
        )}
      </div>

      {isLoading ? (
        <div className="p-6">
          <div className="h-6 w-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : isError ? (
        <div className="p-6 text-sm text-red-600">Couldn&apos;t load transaction history.</div>
      ) : entries.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">
          No sales, orders, appointments, or service jobs recorded for this customer yet.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((e) => (
            <HistoryRow key={`${e.kind}-${e.id}`} entry={e} harakaBase={harakaBase} currency={currency} />
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({
  entry,
  harakaBase,
  currency,
}: {
  entry: CustomerHistoryEntry;
  harakaBase: string;
  currency?: string;
}) {
  const { basePath } = useVertical();
  // The timeline merges records from every module the org runs, but only
  // appointments have a page under BOTH verticals. Transactions, orders, and
  // service jobs are Haraka-only surfaces, so they always link into Haraka —
  // linking them at the Zeyara base would 404. (Reachable only for a mixed org
  // holding both verticals; a clinic-only org has no such rows.)
  const hrefByKind: Record<CustomerHistoryEntry['kind'], string> = {
    transaction: `${harakaBase}/transactions/${entry.id}`,
    order: `${harakaBase}/orders/${entry.id}`,
    appointment: `${basePath}/appointments/${entry.id}`,
    service_job: `${harakaBase}/service-jobs/${entry.id}`,
    // Document Reports is a Haraka surface too — it has no /zeyara route.
    document_report: `${harakaBase}/reports/${entry.id}`,
  };
  const href = hrefByKind[entry.kind];
  const iconByKind: Record<CustomerHistoryEntry['kind'], typeof Receipt> = {
    transaction: Receipt,
    order: ShoppingBag,
    appointment: CalendarClock,
    service_job: Wrench,
    document_report: FileText,
  };
  const Icon = iconByKind[entry.kind];
  const kindLabel =
    entry.kind === 'transaction' ? (entry.isRefund ? 'Refund' : 'Sale')
    : entry.kind === 'order' ? 'Order'
    : entry.kind === 'appointment' ? 'Appointment'
    : entry.kind === 'service_job' ? 'Service Job'
    : 'Report';

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-hover"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-card text-gray-500">
          <Icon size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{entry.reference}</span>
            <span className="text-xs text-gray-500">{kindLabel}</span>
            <StatusBadge status={entry.status} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <span>{new Date(entry.date).toLocaleString()}</span>
            <span aria-hidden>·</span>
            <span>{entry.itemCount} item{entry.itemCount === 1 ? '' : 's'}</span>
            {entry.paymentStatus && (
              <>
                <span aria-hidden>·</span>
                <span className="capitalize">{entry.paymentStatus}</span>
              </>
            )}
            {entry.paymentMethods.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="capitalize">{entry.paymentMethods.join(', ')}</span>
              </>
            )}
            {entry.invoiceNumber && (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <FileText size={11} /> {entry.invoiceNumber}
              </span>
            )}
          </div>
        </div>

        <div className="text-end">
          <div className={`text-sm font-semibold ${entry.isRefund ? 'text-red-600' : ''}`}>
            {entry.isRefund ? '−' : ''}{formatCurrency(entry.total, currency)}
          </div>
          {entry.amountPaid !== null && entry.amountPaid < entry.total && (
            <div className="text-xs text-gray-500">
              {formatCurrency(entry.amountPaid, currency)} paid
            </div>
          )}
        </div>

        <ChevronRight size={16} className="shrink-0 text-gray-400 rtl:rotate-180" />
      </Link>
    </li>
  );
}

function Field({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-sm ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</div>
    </div>
  );
}
