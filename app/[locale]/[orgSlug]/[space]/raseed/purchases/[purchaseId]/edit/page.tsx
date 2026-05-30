'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared';
import { PurchaseForm } from '@/components/inventory/purchases/PurchaseForm';
import { usePurchase } from '@/hooks/inventory';

interface Props {
  params: Promise<{ locale: string; orgSlug: string; space: string; purchaseId: string }>;
}

export default function EditPurchasePage(props: Props) {
  const params = use(props.params);
  const router = useRouter();
  const { data, isLoading } = usePurchase(params.purchaseId);

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!data?.purchase) return <div className="p-6">Purchase not found.</div>;
  if (data.purchase.status !== 'draft') {
    return (
      <div className="p-6">
        <p>Only draft purchases can be edited.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title={`Edit purchase`}
        description={data.purchase.supplierName}
        breadcrumb={[
          { label: 'Raseed', href: `/${params.locale}/${params.orgSlug}/${params.space}/raseed` },
          { label: 'Purchases', href: `/${params.locale}/${params.orgSlug}/${params.space}/raseed/purchases` },
          {
            label: data.purchase.supplierName,
            href: `/${params.locale}/${params.orgSlug}/${params.space}/raseed/purchases/${params.purchaseId}`,
          },
          { label: 'Edit', href: '#' },
        ]}
      />
      <PurchaseForm
        purchase={data.purchase}
        onSuccess={() => router.push(`/${params.locale}/${params.orgSlug}/${params.space}/raseed/purchases/${params.purchaseId}`)}
      />
    </div>
  );
}
