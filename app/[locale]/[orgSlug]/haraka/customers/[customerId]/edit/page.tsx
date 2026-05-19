'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared';
import { CustomerForm } from '@/components/haraka/CustomerForm';
import { useCustomer, useUpdateCustomer } from '@/hooks/haraka';
import { toast } from '@/hooks/ui';
import type { CustomerFormData } from '@/lib/modules/haraka/customers/schemas';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; customerId: string }>();
  const { data, isLoading } = useCustomer(params.customerId);
  const updateMut = useUpdateCustomer();

  const base = `/${params.locale}/${params.orgSlug}/haraka/customers`;
  const customer = data?.customer;

  async function handleSubmit(values: CustomerFormData) {
    try {
      await updateMut.mutateAsync({ id: params.customerId, patch: values });
      toast.success('Customer updated');
      router.replace(`${base}/${params.customerId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (isLoading || !customer) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={`Edit ${customer.name}`}
        breadcrumb={[
          { label: 'Haraka', href: `/${params.locale}/${params.orgSlug}/haraka` },
          { label: 'Customers', href: base },
          { label: customer.name, href: `${base}/${customer.id}` },
          { label: 'Edit', href: '#' },
        ]}
      />
      <CustomerForm
        initial={{
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          taxNumber: customer.taxNumber,
          notes: customer.notes,
        }}
        submitLabel="Save changes"
        loading={updateMut.isPending}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`${base}/${customer.id}`)}
      />
    </div>
  );
}
