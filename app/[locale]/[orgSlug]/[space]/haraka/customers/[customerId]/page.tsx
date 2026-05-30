'use client';

import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCustomer, useDeleteCustomer } from '@/hooks/haraka';
import { toast } from '@/hooks/ui';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; customerId: string }>();
  const { data, isLoading } = useCustomer(params.customerId);
  const deleteMut = useDeleteCustomer();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const base = `/${params.locale}/${params.orgSlug}/haraka/customers`;
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
          { label: 'Haraka', href: `/${params.locale}/${params.orgSlug}/haraka` },
          { label: 'Customers', href: base },
          { label: customer.name, href: '#' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`${base}/${customer.id}/edit`)}>
              <Pencil size={14} className="me-1" /> Edit
            </Button>
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
        <Field label="Tax number" value={customer.taxNumber ?? '—'} />
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

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete customer?"
        description={`"${customer.name}" will be removed. Past sales referencing this customer keep their snapshotted name.`}
        confirmLabel="Delete"
        onConfirm={onDelete}
        loading={deleteMut.isPending}
      />
    </div>
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
