'use client';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useT } from '@/hooks/ui';
import { useAsset } from '@/hooks/assets';
import { useWarranties } from '@/hooks/warranties';
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
import { RequestActionPanel } from '@/components/assets/RequestActionPanel';
import { Pencil } from 'lucide-react';
import { AssetNotesSection } from '@/components/assets/AssetNotesSection';
import { MaintenanceSection } from '@/components/assets/MaintenanceSection';
import { CheckoutSection } from '@/components/assets/CheckoutSection';
import { AssetQRCard } from '@/components/assets/AssetQRCard';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { AssetForm } from '@/components/assets/AssetForm';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { useState, use } from 'react';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UserHoverCard } from '@/components/shared/UserHoverCard';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

/* ── Icons ───────────────────────────────────────────────────────── */
function EditSVG() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /></svg>;
}
function PlusSVG() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function QrSVG() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><rect x="1" y="1" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.2" fill="none" /><rect x="8" y="1" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.2" fill="none" /><rect x="1" y="8" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.2" fill="none" /><path d="M8 8h2v2H8zM10 10h3v3h-3z" fill="currentColor" opacity="0.7" /></svg>;
}
function ArrowUpRightSVG() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M3.5 10.5L10.5 3.5M4.5 3.5h6v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function UploadSVG() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 10V3M5 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
function TrashSVG() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* ── KV row ──────────────────────────────────────────────────────── */
function KVRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-border last:border-0 items-start">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{children}</span>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function AssetDetailPage(props: { params: Promise<{ assetId: string }> }) {
  const params = use(props.params);
  const { assetId } = params;
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { locale } = useT();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data: asset, isLoading, error } = useAsset(assetId);
  const { data: warrantiesResponse, isLoading: wLoading } = useWarranties({ assetId });
  const warranties = warrantiesResponse?.items ?? [];
  const [showRetire, setShowRetire] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [editAssetOpen, setEditAssetOpen] = useState(false);
  const [editWarrantyTarget, setEditWarrantyTarget] = useState<Warranty | null>(null);
  const [addWarrantyOpen, setAddWarrantyOpen] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';
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
      router.push(`/${locale}/${orgSlug}/usool`);
    } catch {
      toast.error(isRetired ? 'Failed to delete asset' : 'Failed to retire asset');
    } finally {
      setRetiring(false);
      setShowRetire(false);
    }
  }

  const wColumns: ColumnDef<Warranty>[] = [
    { key: 'vendor', header: 'Vendor', render: (w) => <span className="text-sm font-medium">{w.vendor}</span> },
    { key: 'startDate', header: 'Start', render: (w) => <span className="text-sm text-gray-500 tabular-nums">{formatDate(w.startDate)}</span> },
    {
      key: 'endDate', header: 'End',
      render: (w) => (
        <span className={`text-sm tabular-nums font-medium ${isExpired(w.endDate) ? 'text-red-600 dark:text-red-400' : 'text-gray-700'}`}>
          {formatDate(w.endDate)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: '',
      render: (w) => isAdmin ? (
        <Button size="sm" variant="ghost" onClick={() => setEditWarrantyTarget(w)}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
      ) : null,
    },
  ];

  if (isLoading) return <LoadingSkeleton rows={6} columns={2} />;
  if (error || !asset) return <ErrorState message="Asset not found." />;

  return (
    <div>
      <PageHeader
        title={asset.name}
        breadcrumb={[{ label: 'Assets', href: `/${locale}/${orgSlug}/usool` }, { label: asset.name, href: `/${locale}/${orgSlug}/usool/${assetId}` }]}
        actions={isAdmin ? (
          <div className="flex gap-2">
            {asset.status !== 'Retired' && (
              <Button variant="outline" size="sm" onClick={() => setEditAssetOpen(true)}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} /><span className="ml-1">Edit</span>
              </Button>
            )}
            {asset.status === 'Active' && (
              <Button variant="destructive" size="sm" onClick={() => setShowRetire(true)}>
                <TrashSVG /><span className="ml-1.5">Retire</span>
              </Button>
            )}
            {asset.status === 'Retired' && (
              <Button variant="destructive" size="sm" onClick={() => setShowRetire(true)}>
                Delete permanently
              </Button>
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

          {/* Record history card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Record history</h2>
              <div>
                <KVRow label="Created by">
                  <UserHoverCard user={{ uid: asset.createdBy, name: asset.createdByName, email: asset.createdByEmail, role: asset.createdByRole }} />
                </KVRow>
                <KVRow label="Created at">
                  <span className="text-gray-700 tabular-nums">{formatDate(asset.createdAt)}</span>
                </KVRow>
                <KVRow label="Updated by">
                  <UserHoverCard user={{ uid: asset.updatedBy, name: asset.updatedByName, email: asset.updatedByEmail, role: asset.updatedByRole }} />
                </KVRow>
                <KVRow label="Updated at">
                  <span className="text-gray-700 tabular-nums">{formatDate(asset.updatedAt)}</span>
                </KVRow>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Warranties — full width */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Warranties</h2>
            {isAdmin && (() => {
              const now = new Date();
              const hasActiveWarranty = (warranties as Warranty[]).some((w) => new Date(w.endDate) >= now);
              if (hasActiveWarranty) return null;
              if (isRetired) {
                return (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button size="sm" variant="ghost" disabled aria-disabled="true" className="pointer-events-none opacity-50">
                            <PlusSVG /><span className="ml-1">Add warranty</span>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Cannot add a warranty to a retired asset.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }
              return (
                <Button size="sm" variant="ghost" onClick={() => setAddWarrantyOpen(true)}>
                  <PlusSVG /><span className="ml-1">Add warranty</span>
                </Button>
              );
            })()}
          </div>
          <DataTable
            data={warranties}
            columns={wColumns}
            isLoading={wLoading}
            emptyMessage="No warranties attached."
            keyExtractor={(w) => w.id}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CheckoutSection assetId={assetId} assetName={asset.name} />
        <AssetQRCard assetId={assetId} assetName={asset.name} orgSlug={orgSlug} locale={locale} />
      </div>

      {/* Notes + Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <AssetNotesSection assetId={assetId} />
        <MaintenanceSection assetId={assetId} />
      </div>

      {/* Quick actions (staff) */}
      {isStaff && (
        <RequestActionPanel assetId={assetId} warranties={warranties} />
      )}


      {/* Linked records */}
      {(() => {
        const extended = asset as Asset & { poNumber?: string; invoiceRef?: string; insurance?: string };
        return extended.poNumber || extended.invoiceRef || extended.insurance ? (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Linked</h2>
              <div className="space-y-3">
                {extended.poNumber && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">PO number</span>
                    <span className="font-mono text-xs text-gray-900">{extended.poNumber}</span>
                  </div>
                )}
                {extended.invoiceRef && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Invoice</span>
                    <button className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                      {extended.invoiceRef} <ArrowUpRightSVG />
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* ── Dialogs ───────────────────────────────────────────────── */}
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

      <FormDrawer open={editAssetOpen} onOpenChange={setEditAssetOpen} title="Edit Asset">
        <AssetForm asset={asset} onSuccess={() => setEditAssetOpen(false)} />
      </FormDrawer>

      <FormDrawer
        open={!!editWarrantyTarget}
        onOpenChange={(o) => { if (!o) setEditWarrantyTarget(null); }}
        title="Edit Warranty"
      >
        {editWarrantyTarget && (
          <WarrantyForm warranty={editWarrantyTarget} onSuccess={() => setEditWarrantyTarget(null)} />
        )}
      </FormDrawer>

      <FormDrawer open={addWarrantyOpen} onOpenChange={setAddWarrantyOpen} title="Add Warranty">
        <WarrantyForm
          defaultAssetId={assetId}
          onSuccess={() => setAddWarrantyOpen(false)}
        />
      </FormDrawer>
    </div>
  );
}
