'use client';
import { useRouter } from 'next/navigation';
import { useOrganizations } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Organization } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { Plus, ArrowRight } from 'lucide-react';
import { useTransferMode } from '@/hooks/useTransferMode';

export default function SuperAdminPage() {
  const router = useRouter();
  const { data: orgs = [], isLoading } = useOrganizations();
  const { enterTransferMode } = useTransferMode();

  const columns: ColumnDef<Organization>[] = [
    { key: 'name', header: 'Name', render: (o) => <span className="font-medium text-gray-900">{o.name}</span> },
    { key: 'subdomain', header: 'Subdomain', render: (o) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{o.subdomain}</span> },
    { key: 'contactEmail', header: 'Contact Email', render: (o) => o.contactEmail },
    { key: 'createdAt', header: 'Created', render: (o) => formatDate(o.createdAt) },
    {
      key: 'actions', header: 'Actions',
      render: (o) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); enterTransferMode(o.id, o.name); }}>
            <ArrowRight className="h-3.5 w-3.5 mr-1" /> Enter Org
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/super-admin/organizations/${o.id}/subscription`); }}>
            Subscription
          </Button>
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader
        title="Organizations"
        actions={<Button size="sm" onClick={() => router.push('/super-admin/organizations/new')}><Plus className="h-4 w-4 mr-1" />Create Organization</Button>}
      />
      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable data={orgs} columns={columns} isLoading={isLoading} emptyMessage="No organizations yet." keyExtractor={(o) => o.id} />
      </div>
    </div>
  );
}
