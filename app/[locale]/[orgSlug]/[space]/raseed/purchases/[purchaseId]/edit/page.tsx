'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared';
import { PurchaseForm } from '@/components/inventory/purchases/PurchaseForm';
import { usePurchase } from '@/hooks/inventory';
import { useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

interface Props {
  params: Promise<{ locale: string; orgSlug: string; space: string; purchaseId: string }>;
}

export default function EditPurchasePage(props: Props) {
  const params  = use(props.params);
  const router  = useRouter();
  const { t }   = useT();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = usePurchase(params.purchaseId);

  const base        = `/${params.locale}/${params.orgSlug}/${params.space}/raseed`;
  const purchaseHref = `${base}/purchases/${params.purchaseId}`;

  if (isLoading) return <LoadingSkeleton rows={4} columns={2} />;
  if (!data?.purchase) return <ErrorState message={t('assets.notFound')} />;
  if (data.purchase.status !== 'draft') {
    return (
      <div className="p-6">
        <ErrorState message={t('assets.notFound')} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={data.purchase.supplierName}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.inventory'),  href: `${base}/list` },
          { label: t('nav.purchases'),  href: `${base}/purchases` },
          { label: data.purchase.supplierName, href: purchaseHref },
          { label: t('common.edit') },
        ]}
      />
      <PurchaseForm
        purchase={data.purchase}
        onSuccess={() => router.push(purchaseHref)}
      />
    </div>
  );
}
