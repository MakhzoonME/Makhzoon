'use client';
import { useAsset } from '@/hooks/useAssets';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetForm } from '@/components/assets/AssetForm';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

export default function EditAssetPage({ params }: { params: { assetId: string } }) {
  const { assetId } = params;
  const { data: asset, isLoading } = useAsset(assetId);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div>
      <PageHeader
        title="Edit Asset"
        breadcrumb={[
          { label: 'Assets', href: '/assets' },
          { label: asset?.name ?? 'Asset', href: `/assets/${assetId}` },
          { label: 'Edit', href: `/assets/${assetId}/edit` },
        ]}
      />
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {asset && <AssetForm asset={asset} />}
      </div>
    </div>
  );
}
