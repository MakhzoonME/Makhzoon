import { PageHeader } from '@/components/shared/PageHeader';
import { AssetForm } from '@/components/assets/AssetForm';

export default function NewAssetPage() {
  return (
    <div>
      <PageHeader
        title="Add Asset"
        breadcrumb={[{ label: 'Assets', href: '/assets' }, { label: 'New Asset', href: '/assets/new' }]}
      />
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <AssetForm />
      </div>
    </div>
  );
}
