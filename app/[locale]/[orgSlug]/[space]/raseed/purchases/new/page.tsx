'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared';
import { PurchaseForm } from '@/components/inventory/purchases/PurchaseForm';
import { useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';

export default function NewPurchasePage() {
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/raseed`;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={t('purchases.newTitle')}
        description={t('purchases.newDesc')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.inventory'), href: `${base}/list` },
          { label: t('nav.purchases'), href: `${base}/purchases` },
          { label: t('purchases.newTitle') },
        ]}
      />
      <PurchaseForm />
    </div>
  );
}
