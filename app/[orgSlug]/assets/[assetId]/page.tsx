'use client';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useAsset } from '@/hooks/useAssets';
import { useWarranties } from '@/hooks/useWarranties';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatDate, isExpired, getWarrantyStatus } from '@/lib/utils/date';
import { Asset, Warranty } from '@/types';
import { Edit, Plus } from 'lucide-react';
import { RequestActionPanel } from '@/components/assets/RequestActionPanel';
import { AssetNotesSection } from '@/components/assets/AssetNotesSection';
import { MaintenanceSection } from '@/components/assets/MaintenanceSection';
import { CheckoutSection } from '@/components/assets/CheckoutSection';
import { AssetQRCard } from '@/components/assets/AssetQRCard';
import { useState } from 'react';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UserHoverCard } from '@/components/shared/UserHoverCard';

export default function AssetDetailPage({ params }: { params: { assetId: string } }) {
  const { assetId } = params;
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data: asset, isLoading, error } = useAsset(assetId);
  const { data: warranties = [], isLoading: wLoading } = useWarranties({ assetId });
  const [showRetire, setShowRetire] = useState(false);
  const [retiring, setRetiring] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isStaff = user?.role === 'staff';
  const isRetired = asset?.status === 'Retired';

  async function handleRetire() {
    setRetiring(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success(isRetired ? 'Asset permanently deleted' : 'Asset retired');
      qc.setQueriesData<{ items: Asset[]; nextCursor: string | null }>(
        { queryKey: ['assets'] },
        (old) => old?.items ? { ...old, items: old.items.filter((a) => a.id !== assetId) } : old,
      );
      qc.removeQueries({ queryKey: ['assets', assetId] });
      router.push(`/${orgSlug}/assets`);
    } catch { toast.error(isRetired ? 'Failed to delete asset' : 'Failed to retire asset'); }
    finally { setRetiring(false); setShowRetire(false); }
  }

  const wColumns: ColumnDef<Warranty>[] = [
    { key: 'vendor', header: 'Vendor', render: (w) => w.vendor },
    { key: 'startDate', header: 'Start Date', render: (w) => formatDate(w.startDate) },
    {
      key: 'endDate', header: 'End Date',
      render: (w) => <span className={isExpired(w.endDate) ? 'text-red-600' : ''}>{formatDate(w.endDate)}</span>
    },
    { key: 'status', header: 'Status', render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: 'Actions',
      render: (w) => isAdmin ? (
        <Button size="sm" variant="ghost" onClick={() => router.push(`/${orgSlug}/warranties/${w.id}/edit`)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
      ) : null
    },
  ];

  if (isLoading) return <LoadingSkeleton rows={6} columns={2} />;
  if (error || !asset) return <ErrorState message="Asset not found." />;

  return (
    <div>
      <PageHeader
        title={`Asset: ${asset.name}`}
        breadcrumb={[{ label: 'Assets', href: `/${orgSlug}/assets` }, { label: asset.name, href: `/${orgSlug}/assets/${assetId}` }]}
        actions={isAdmin ? (
          <div className="flex gap-2">
            {asset.status !== 'Retired' && (
              <Button variant="outline" size="sm" onClick={() => router.push(`/${orgSlug}/assets/${assetId}/edit`)}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
            {asset.status === 'Active' && (
              <Button variant="destructive" size="sm" onClick={() => setShowRetire(true)}>Retire</Button>
            )}
            {asset.status === 'Retired' && (
              <Button variant="destructive" size="sm" onClick={() => setShowRetire(true)}>Delete Permanently</Button>
            )}
          </div>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Category', asset.category],
                ['Status', <StatusBadge key="s" status={asset.status} />],
                ['Serial Number', asset.serialNumber ? <span className="font-mono text-xs">{asset.serialNumber}</span> : '—'],
                ['Assigned To', asset.assignedTo || '—'],
                ['Location', asset.location || '—'],
                ['Purchase Cost', asset.purchaseCost ? `${asset.purchaseCost} JOD` : '—'],
                ['Purchase Date', asset.purchaseDate ? formatDate(asset.purchaseDate) : '—'],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{value}</dd>
                </div>
              ))}
              {asset.notes && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="font-medium text-gray-900 mt-0.5 whitespace-pre-wrap">{asset.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Metadata</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 mb-0.5">Created By</dt>
                <dd><UserHoverCard user={{ uid: asset.createdBy, name: asset.createdByName, email: asset.createdByEmail, role: asset.createdByRole }} /></dd>
              </div>
              <div>
                <dt className="text-gray-500">Created At</dt>
                <dd className="font-medium text-gray-900">{formatDate(asset.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-0.5">Updated By</dt>
                <dd><UserHoverCard user={{ uid: asset.updatedBy, name: asset.updatedByName, email: asset.updatedByEmail, role: asset.updatedByRole }} /></dd>
              </div>
              <div>
                <dt className="text-gray-500">Updated At</dt>
                <dd className="font-medium text-gray-900">{formatDate(asset.updatedAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">WARRANTIES</h2>
          {isAdmin && (() => {
            const now = new Date();
            const hasActiveWarranty = (warranties as Warranty[]).some((w) => new Date(w.endDate) >= now);
            return !hasActiveWarranty && (
              <Button size="sm" onClick={() => router.push(`/${orgSlug}/warranties/new?assetId=${assetId}`)}>
                <Plus className="h-4 w-4 mr-1" />Add Warranty
              </Button>
            );
          })()}
        </div>
        <DataTable data={warranties} columns={wColumns} isLoading={wLoading} emptyMessage="No warranties attached." keyExtractor={(w) => w.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CheckoutSection assetId={assetId} assetName={asset.name} />
        <AssetQRCard assetId={assetId} assetName={asset.name} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AssetNotesSection assetId={assetId} />
        <MaintenanceSection assetId={assetId} />
      </div>

      {isStaff && <RequestActionPanel assetId={assetId} warranties={warranties} />}

      <ConfirmDialog
        open={showRetire}
        onOpenChange={setShowRetire}
        title={isRetired ? 'Delete Asset Permanently' : 'Retire Asset'}
        description={isRetired
          ? `Permanently delete "${asset.name}"? This cannot be undone.`
          : `Are you sure you want to retire "${asset.name}"?`}
        confirmLabel={isRetired ? 'Delete Permanently' : 'Retire'}
        onConfirm={handleRetire}
        loading={retiring}
      />
    </div>
  );
}
