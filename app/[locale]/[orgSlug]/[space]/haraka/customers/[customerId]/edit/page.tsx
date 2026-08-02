'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared';
import { CustomerForm } from '@/components/haraka/CustomerForm';
import { useCustomer, useUpdateCustomer } from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import type { CustomerFormData } from '@/lib/modules/haraka/customers/schemas';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string; customerId: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = useCustomer(params.customerId);
  const updateMut = useUpdateCustomer();

  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka/customers`;
  const customer = data?.customer;

  async function handleSubmit(values: CustomerFormData) {
    try {
      await updateMut.mutateAsync({ id: params.customerId, patch: values });
      toast.success(t('common.updated'));
      router.replace(`${base}/${params.customerId}`);
      return { id: params.customerId };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  if (isLoading || !customer) return <LoadingSkeleton rows={4} columns={2} />;

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={customer.name}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: t('customers.title'), href: base },
          { label: customer.name, href: `${base}/${customer.id}` },
          { label: t('common.edit') },
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
        recordId={customer.id}
        submitLabel={t('common.saveChanges')}
        loading={updateMut.isPending}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`${base}/${customer.id}`)}
      />
    </div>
  );
}
