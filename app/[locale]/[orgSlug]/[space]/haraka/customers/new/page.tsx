'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared';
import { CustomerForm } from '@/components/haraka/CustomerForm';
import { useCreateCustomer } from '@/hooks/haraka';
import { toast } from '@/hooks/ui';
import type { CustomerFormData } from '@/lib/modules/haraka/customers/schemas';

export default function NewCustomerPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const createMut = useCreateCustomer();
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka/customers`;

  async function handleSubmit(values: CustomerFormData) {
    try {
      const { id } = await createMut.mutateAsync(values);
      toast.success('Customer created');
      router.replace(`${base}/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title="New customer"
        breadcrumb={[
          { label: 'Haraka', href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: 'Customers', href: base },
          { label: 'New', href: '#' },
        ]}
      />
      <CustomerForm
        submitLabel="Create customer"
        loading={createMut.isPending}
        onSubmit={handleSubmit}
        onCancel={() => router.push(base)}
      />
    </div>
  );
}
