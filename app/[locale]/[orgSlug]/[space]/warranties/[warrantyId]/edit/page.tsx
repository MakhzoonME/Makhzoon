'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useWarranty } from '@/hooks/warranties';
import { PageHeader } from '@/components/shared/PageHeader';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

export default function EditWarrantyPage(props: { params: Promise<{ warrantyId: string }> }) {
  const { warrantyId } = use(props.params);
  const router  = useRouter();
  const orgSlug = useOrgSlug();
  const space   = useSpace();
  const { t, locale } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading, error } = useWarranty(warrantyId);

  const listHref = `/${locale}/${orgSlug}/${space}/warranties`;
  const warranty = data?.warranty ?? data;

  if (isLoading) return <LoadingSkeleton rows={5} columns={2} />;
  if (error || !warranty) return <ErrorState message={t('assets.notFound')} />;

  const label = (warranty as { vendor?: string }).vendor ?? t('warranties.editWarranty');

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={label}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.warranties'), href: listHref },
          { label: t('common.edit') },
        ]}
      />
      <WarrantyForm
        warranty={warranty as Parameters<typeof WarrantyForm>[0]['warranty']}
        onSuccess={() => router.push(listHref)}
        onCancel={() => router.push(listHref)}
      />
    </div>
  );
}
