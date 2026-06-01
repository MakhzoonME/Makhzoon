'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared';
import { CustomerForm } from '@/components/haraka/CustomerForm';
import { useCreateCustomer } from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import type { CustomerFormData } from '@/lib/modules/haraka/customers/schemas';

export default function NewCustomerPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const createMut = useCreateCustomer();
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka/customers`;

  async function handleSubmit(values: CustomerFormData) {
    try {
      const { id } = await createMut.mutateAsync(values);
      toast.success(t('customers.addCustomer'));
      router.replace(`${base}/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('customers.addCustomer')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: t('customers.title'), href: base },
          { label: t('customers.addCustomer') },
        ]}
      />
      <CustomerForm
        submitLabel={t('customers.addCustomer')}
        loading={createMut.isPending}
        onSubmit={handleSubmit}
        onCancel={() => router.push(base)}
      />
    </div>
  );
}
