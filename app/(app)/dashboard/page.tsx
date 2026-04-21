'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, daysUntil } from '@/lib/utils/date';
import { Asset, Warranty } from '@/types';
import { Package, Archive, AlertTriangle } from 'lucide-react';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [assetsRes, warrantiesRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/warranties?expiringSoon=true'),
      ]);
      const assetsBody = assetsRes.ok ? await assetsRes.json() : [];
      const warrantiesBody = warrantiesRes.ok ? await warrantiesRes.json() : [];
      const assets: Asset[] = Array.isArray(assetsBody) ? assetsBody : [];
      const warranties: Warranty[] = Array.isArray(warrantiesBody) ? warrantiesBody : [];
      return { assets, warranties };
    },
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useDashboard();

  const activeAssets = data?.assets.filter((a) => a.status === 'Active') ?? [];
  const retiredAssets = data?.assets.filter((a) => a.status === 'Retired') ?? [];
  const expiringWarranties = data?.warranties ?? [];
  const recentAssets = (data?.assets ?? []).slice(0, 10);

  const assetColumns: ColumnDef<Asset>[] = [
    { key: 'name', header: 'Name', render: (a) => <span className="font-medium text-gray-900">{a.name}</span> },
    { key: 'category', header: 'Category', render: (a) => a.category },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'createdBy', header: 'Added By', render: (a) => a.createdBy },
    { key: 'createdAt', header: 'Date Added', render: (a) => formatDate(a.createdAt) },
  ];

  const warrantyColumns: ColumnDef<Warranty>[] = [
    { key: 'assetId', header: 'Asset', render: (w) => w.assetId },
    { key: 'vendor', header: 'Vendor', render: (w) => w.vendor },
    { key: 'endDate', header: 'Expiry Date', render: (w) => <span className="text-red-600">{formatDate(w.endDate)}</span> },
    {
      key: 'days', header: 'Days Remaining', render: (w) => {
        const d = daysUntil(w.endDate);
        return <span className={d < 7 ? 'text-red-600 font-semibold' : 'text-yellow-700'}>{d} days</span>;
      }
    },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => router.push('/assets?status=Active')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50"><Package className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Active Assets</p>
                {isLoading ? <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-gray-900">{activeAssets.length}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => router.push('/assets?status=Retired')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100"><Archive className="h-5 w-5 text-gray-500" /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Retired Assets</p>
                {isLoading ? <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-gray-900">{retiredAssets.length}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => router.push('/warranties?expiring=30')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50"><AlertTriangle className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Expiring Soon</p>
                {isLoading ? <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-gray-900">{expiringWarranties.length} <span className="text-sm font-normal text-gray-500">warranties</span></p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Recent Assets</h2>
            </div>
            <DataTable
              data={recentAssets}
              columns={assetColumns}
              isLoading={isLoading}
              emptyMessage="No assets added yet."
              onRowClick={(a) => router.push(`/assets/${a.id}`)}
              keyExtractor={(a) => a.id}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Expiring Warranties</h2>
            </div>
            <DataTable
              data={expiringWarranties}
              columns={warrantyColumns}
              isLoading={isLoading}
              emptyMessage="No warranties expiring soon."
              keyExtractor={(w) => w.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
