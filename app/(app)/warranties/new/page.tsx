import { PageHeader } from '@/components/shared/PageHeader';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';

export default function NewWarrantyPage() {
  return (
    <div>
      <PageHeader title="Add Warranty" breadcrumb={[{ label: 'Warranties', href: '/warranties' }, { label: 'New', href: '/warranties/new' }]} />
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <WarrantyForm />
      </div>
    </div>
  );
}
