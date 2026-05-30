'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared';
import { PurchaseForm } from '@/components/inventory/purchases/PurchaseForm';

export default function NewPurchasePage() {
  const params = useParams<{ locale: string; orgSlug: string }>();
  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title="New purchase"
        description="Record a supplier delivery as a draft. You can edit it before receiving."
        breadcrumb={[
          { label: 'Raseed', href: `/${params.locale}/${params.orgSlug}/raseed` },
          { label: 'Purchases', href: `/${params.locale}/${params.orgSlug}/raseed/purchases` },
          { label: 'New', href: '#' },
        ]}
      />
      <PurchaseForm />
    </div>
  );
}
