'use client';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';

export default function NewWarrantyPage() {
  const router  = useRouter();
  const orgSlug = useOrgSlug();
  const space   = useSpace();
  const { t, locale } = useT();
  const { data: orgInfo } = useOrgInfo();

  const listHref = `/${locale}/${orgSlug}/${space}/warranties`;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={t('warranties.addWarranty')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.warranties'), href: listHref },
          { label: t('warranties.addWarranty') },
        ]}
      />
      <WarrantyForm
        onSuccess={() => router.push(listHref)}
        onCancel={() => router.push(listHref)}
      />
    </div>
  );
}
