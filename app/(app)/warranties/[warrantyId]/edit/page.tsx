'use client';
import { use } from 'react';
import { useWarranty } from '@/hooks/useWarranties';
import { PageHeader } from '@/components/shared/PageHeader';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

export default function EditWarrantyPage({ params }: { params: Promise<{ warrantyId: string }> }) {
  const { warrantyId } = use(params);
  const { data: warranty, isLoading } = useWarranty(warrantyId);

  if (isLoading) return <LoadingSkeleton />;
  return (
    <div>
      <PageHeader title="Edit Warranty" breadcrumb={[{ label: 'Warranties', href: '/warranties' }, { label: 'Edit', href: '' }]} />
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {warranty && <WarrantyForm warranty={warranty} />}
      </div>
    </div>
  );
}
