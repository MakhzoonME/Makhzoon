'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { useAsset } from '@/hooks/assets';
import { useWarranties } from '@/hooks/warranties';
import { useAuthStore } from '@/store/auth.store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatDate, isExpired, getWarrantyStatus } from '@/lib/utils/date';
import { Asset, Warranty } from '@/types';
import { RequestActionPanel } from '@/components/assets/RequestActionPanel';
import { Pencil, Archive, Trash2, ArrowRight, Copy } from 'lucide-react';
import { useOrgInfo } from '@/hooks/org';
import { MoveResourceDialog } from '@/components/spaces/MoveResourceDialog';
import { DuplicateResourceDialog } from '@/components/spaces/DuplicateResourceDialog';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { AssetNotesSection } from '@/components/assets/AssetNotesSection';
import { MaintenanceSection } from '@/components/assets/MaintenanceSection';
import { CheckoutSection } from '@/components/assets/CheckoutSection';
import { AssetQRCard } from '@/components/assets/AssetQRCard';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { toast } from '@/hooks/ui';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UserHoverCard } from '@/components/shared/UserHoverCard';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

/* ── Icons ───────────────────────────────────────────────────────── */
function PlusSVG() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function PackageIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <path d="M22 8L13 3 4 8v10l9 5 9-5V8z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M13 3v18M4 8l9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ArrowUpRightSVG() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M3.5 10.5L10.5 3.5M4.5 3.5h6v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
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

/* ── ActivityTimeline ────────────────────────────────────────────── */
type AuditEntry = {
  id: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  module?: string;
  createdAt: string | number;
};

const ACTION_COLORS: Record<string, { dot: string; label: string }> = {
  CREATED:  { dot: 'bg-indigo-500', label: 'text-indigo-700 dark:text-indigo-400' },
  UPDATED:  { dot: 'bg-blue-500',   label: 'text-blue-700 dark:text-blue-400' },
  RETIRED:  { dot: 'bg-gray-400',   label: 'text-gray-600' },
  DELETED:  { dot: 'bg-red-500',    label: 'text-red-700 dark:text-red-400' },
  APPROVED: { dot: 'bg-green-500',  label: 'text-green-700 dark:text-green-400' },
};

function ActivityTimeline({ assetId, createdBy, createdAt, updatedBy, updatedAt, asset }: {
  assetId: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  asset: Asset;
}) {
  const { t } = useT();
  const { data } = useQuery<{ items: AuditEntry[] }>({
    queryKey: ['asset-audit', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?recordId=${assetId}&limit=6`);
      if (!res.ok) return { items: [] };
      return res.json();
    },
    staleTime: 60_000,
  });

  const logs = data?.items ?? [];

  const toStr = (d: string | number | Date): string =>
    d instanceof Date ? d.toISOString() : String(d);

  const timeline = logs.length > 0 ? logs : [
    { id: 'upd', action: 'UPDATED', actorName: asset.updatedByName ?? updatedBy, createdAt: toStr(updatedAt) },
    { id: 'cre', action: 'CREATED', actorName: asset.createdByName ?? createdBy, createdAt: toStr(createdAt) },
  ];

  return (
    <div className="space-y-0">
      {timeline.map((entry, i) => {
        const colors = ACTION_COLORS[entry.action?.toUpperCase()] ?? ACTION_COLORS.UPDATED;
        const isLast = i === timeline.length - 1;
        return (
          <div key={entry.id} className="flex gap-3 relative">
            {/* connector line */}
            {!isLast && (
              <div className="absolute start-[11px] top-7 bottom-0 w-px bg-border" />
            )}
            {/* dot */}
            <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${colors.dot}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 leading-snug truncate">
                {entry.actorName ?? entry.actorEmail ?? t('common.system')}
              </p>
              <p className={`text-xs mt-0.5 font-medium ${colors.label}`}>
                {entry.action.charAt(0) + entry.action.slice(1).toLowerCase().replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 tabular-nums font-mono">
                {formatDate(typeof entry.createdAt === 'number' ? new Date(entry.createdAt) : entry.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function AssetDetailPage(props: { params: Promise<{ assetId: string }> }) {
  const params = use(props.params);
  const { assetId } = params;
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: orgInfo } = useOrgInfo();
  const { data: asset, isLoading, error } = useAsset(assetId);
  const { data: warrantiesResponse, isLoading: wLoading } = useWarranties({ assetId });
  const warranties = warrantiesResponse?.items ?? [];

  const [activeTab, setActiveTab] = useState('details');
  const [showRetire, setShowRetire] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [dupeOpen, setDupeOpen] = useState(false);
  const [editWarrantyTarget, setEditWarrantyTarget] = useState<Warranty | null>(null);
  const [addWarrantyOpen, setAddWarrantyOpen] = useState(false);

  const isAdmin  = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';
  const isStaff  = user?.role === 'staff';
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
      router.push(`/${locale}/${orgSlug}/${space}/usool`);
    } catch {
      toast.error(isRetired ? 'Failed to delete asset' : 'Failed to retire asset');
    } finally {
      setRetiring(false);
      setShowRetire(false);
    }
  }

  const wColumns: ColumnDef<Warranty>[] = [
    { key: 'vendor',    header: t('col.vendor'),  render: (w) => <span className="text-sm font-medium">{w.vendor}</span> },
    { key: 'startDate', header: t('col.start'),   render: (w) => <span className="text-sm text-gray-500 tabular-nums font-mono">{formatDate(w.startDate)}</span> },
    {
      key: 'endDate', header: t('col.end'),
      render: (w) => (
        <span className={`text-sm tabular-nums font-medium font-mono ${isExpired(w.endDate) ? 'text-red-600 dark:text-red-400' : 'text-gray-700'}`}>
          {formatDate(w.endDate)}
        </span>
      ),
    },
    { key: 'status', header: t('col.status'), render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: '',
      render: (w) => isAdmin ? (
        <Button size="sm" variant="ghost" aria-label={t('common.edit')}
          className="cursor-pointer transition-colors duration-150"
          onClick={() => setEditWarrantyTarget(w)}>
          <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
      ) : null,
    },
  ];

  if (isLoading) return <LoadingSkeleton rows={6} columns={2} />;
  if (error || !asset) return <ErrorState message={t('assets.notFound')} />;

  const tabs = [
    { value: 'details',     label: t('assetDetail.tabDetails') },
    { value: 'warranties',  label: t('assetDetail.tabWarranty') },
    { value: 'maintenance', label: t('assetDetail.tabMaintenance') },
    { value: 'checkouts',   label: t('assetDetail.tabCheckouts') },
    { value: 'notes',       label: t('assetDetail.tabNotes') },
    { value: 'audit',       label: t('assetDetail.tabAudit') },
  ];

  return (
    <div>
      <PageHeader
        title={asset.name}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.assets'), href: `/${locale}/${orgSlug}/${space}/usool/list` },
          { label: asset.name, href: `/${locale}/${orgSlug}/${space}/usool/${assetId}` },
        ]}
        actions={isAdmin ? (
          <div className="flex gap-2 flex-wrap">
            {asset.status !== 'Retired' && (
              <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/${orgSlug}/${space}/usool/${assetId}/edit`)}>
                <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /><span className="ms-1">{t('common.edit')}</span>
              </Button>
            )}
            {asset.status !== 'Retired' && <MoveAssetButton onClick={() => setMoveOpen(true)} />}
            {asset.status !== 'Retired' && <DuplicateAssetButton onClick={() => setDupeOpen(true)} />}
            {asset.status === 'Active' && (
              <Button variant="destructive" size="sm" onClick={() => setShowRetire(true)}>
                <Archive aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /><span className="ms-1.5">{t('assets.retireBtn')}</span>
              </Button>
            )}
            {asset.status === 'Retired' && (
              <Button variant="destructive" size="sm" onClick={() => setShowRetire(true)}>
                <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /><span className="ms-1.5">{t('assets.deleteBtn')}</span>
              </Button>
            )}
          </div>
        ) : undefined}
      />

      {/* ── Asset identity banner ──────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-surface-card rounded-xl border border-border">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-xl"
          style={{ width: 54, height: 54, background: 'var(--primary-50)', color: 'var(--primary-600)' }}
        >
          <PackageIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <h2 className="text-lg font-bold text-gray-900 truncate">{asset.name}</h2>
            <StatusBadge status={asset.status} marker="dot" />
          </div>
          <p className="text-xs text-gray-400 font-mono">
            {assetId}
            {asset.serialNumber && <> · <span>{t('col.serialNumber')}: {asset.serialNumber}</span></>}
          </p>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* ── Details tab ─────────────────────────────────────────── */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: asset details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('assetDetail.detailsTitle')}</h3>
                  <KVRow label={t('col.category')}>{asset.category}</KVRow>
                  <KVRow label={t('col.status')}><StatusBadge status={asset.status} /></KVRow>
                  <KVRow label={t('col.serialNumber')}>
                    {asset.serialNumber
                      ? <span className="font-mono text-xs">{asset.serialNumber}</span>
                      : <span className="text-gray-400">—</span>}
                  </KVRow>
                  <KVRow label={t('col.assignedTo')}>
                    {asset.assignedTo
                      ? (
                        <UserHoverCard
                          showAvatar
                          user={{ uid: asset.assignedTo, name: asset.assignedTo, role: undefined }}
                        />
                      )
                      : <span className="text-gray-400">—</span>}
                  </KVRow>
                  <KVRow label={t('col.location')}>{asset.location || <span className="text-gray-400">—</span>}</KVRow>
                  <KVRow label={t('col.cost')}>
                    {asset.purchaseCost != null
                      ? <span className="font-mono tabular-nums">{asset.purchaseCost.toLocaleString()} JOD</span>
                      : <span className="text-gray-400">—</span>}
                  </KVRow>
                  <KVRow label={t('col.purchaseDate')}>
                    {asset.purchaseDate
                      ? <span className="font-mono tabular-nums text-xs">{formatDate(asset.purchaseDate)}</span>
                      : <span className="text-gray-400">—</span>}
                  </KVRow>
                  {asset.notes && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('col.notes')}</p>
                      <p className="text-sm text-gray-700 bg-surface-page rounded-lg p-3 leading-relaxed whitespace-pre-wrap border border-border">
                        {asset.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Linked records (conditional) */}
              {(() => {
                const ext = asset as Asset & { poNumber?: string; invoiceRef?: string };
                if (!ext.poNumber && !ext.invoiceRef) return null;
                return (
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('assetDetail.linked')}</h3>
                      <div className="space-y-3">
                        {ext.poNumber && (
                          <KVRow label="PO Number">
                            <span className="font-mono text-xs">{ext.poNumber}</span>
                          </KVRow>
                        )}
                        {ext.invoiceRef && (
                          <KVRow label="Invoice">
                            <button className="font-mono text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors duration-150">
                              {ext.invoiceRef} <ArrowUpRightSVG />
                            </button>
                          </KVRow>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Staff quick actions */}
              {isStaff && <RequestActionPanel assetId={assetId} warranties={warranties} />}
            </div>

            {/* Right sidebar: QR + Timeline */}
            <div className="space-y-6">
              <AssetQRCard assetId={assetId} assetName={asset.name} orgSlug={orgSlug} locale={locale} space={space} />

              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('assetDetail.activityTimeline')}</h3>
                  <ActivityTimeline
                    assetId={assetId}
                    createdBy={asset.createdBy}
                    createdAt={asset.createdAt instanceof Date ? asset.createdAt.toISOString() : String(asset.createdAt)}
                    updatedBy={asset.updatedBy}
                    updatedAt={asset.updatedAt instanceof Date ? asset.updatedAt.toISOString() : String(asset.updatedAt)}
                    asset={asset}
                  />
                  <div className="mt-2 pt-3 border-t border-border space-y-2 text-xs text-gray-500">
                    <KVRow label={t('assetDetail.createdBy')}>
                      <UserHoverCard showAvatar user={{ uid: asset.createdBy, name: asset.createdByName, email: asset.createdByEmail, role: asset.createdByRole }} />
                    </KVRow>
                    <KVRow label={t('assetDetail.updatedBy')}>
                      <UserHoverCard showAvatar user={{ uid: asset.updatedBy, name: asset.updatedByName, email: asset.updatedByEmail, role: asset.updatedByRole }} />
                    </KVRow>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Warranties tab ──────────────────────────────────────── */}
        <TabsContent value="warranties">
          <Card>
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{t('assetDetail.tabWarranty')}</h3>
                {isAdmin && (() => {
                  const now = new Date();
                  const hasActive = warranties.some((w) => new Date(w.endDate) >= now);
                  if (hasActive) return null;
                  if (isRetired) {
                    return (
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={0}>
                              <Button size="sm" variant="ghost" disabled aria-disabled="true" className="pointer-events-none opacity-50">
                                <PlusSVG /><span className="ms-1">{t('warranties.addWarranty')}</span>
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{t('warranties.cannotAddRetired')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }
                  return (
                    <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => setAddWarrantyOpen(true)}>
                      <PlusSVG /><span className="ms-1">{t('warranties.addWarranty')}</span>
                    </Button>
                  );
                })()}
              </div>
              <DataTable
                data={warranties}
                columns={wColumns}
                isLoading={wLoading}
                emptyMessage={t('warranties.noWarranties')}
                keyExtractor={(w) => w.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Maintenance tab ─────────────────────────────────────── */}
        <TabsContent value="maintenance">
          <MaintenanceSection assetId={assetId} />
        </TabsContent>

        {/* ── Checkouts tab ───────────────────────────────────────── */}
        <TabsContent value="checkouts">
          <CheckoutSection assetId={assetId} assetName={asset.name} />
        </TabsContent>

        {/* ── Notes tab ───────────────────────────────────────────── */}
        <TabsContent value="notes">
          <AssetNotesSection assetId={assetId} />
        </TabsContent>

        {/* ── Audit trail tab ─────────────────────────────────────── */}
        <TabsContent value="audit">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('assetDetail.tabAudit')}</h3>
              <ActivityTimeline
                assetId={assetId}
                createdBy={asset.createdBy}
                createdAt={asset.createdAt instanceof Date ? asset.createdAt.toISOString() : String(asset.createdAt)}
                updatedBy={asset.updatedBy}
                updatedAt={asset.updatedAt instanceof Date ? asset.updatedAt.toISOString() : String(asset.updatedAt)}
                asset={asset}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <ConfirmDialog
        open={showRetire}
        onOpenChange={setShowRetire}
        title={isRetired ? t('assets.deleteConfirmTitle') : t('assets.retireConfirmTitle')}
        description={isRetired
          ? t('assets.deleteConfirmDesc').replace('this asset', `"${asset.name}"`)
          : t('assets.retireConfirmDesc').replace('this asset', `"${asset.name}"`)}
        confirmLabel={isRetired ? t('assets.deleteBtn') : t('assets.retireBtn')}
        onConfirm={handleRetire}
        loading={retiring}
      />

      <FormDrawer
        open={!!editWarrantyTarget}
        onOpenChange={(o) => { if (!o) setEditWarrantyTarget(null); }}
        title={t('warranties.editWarranty')}
      >
        {editWarrantyTarget && (
          <WarrantyForm warranty={editWarrantyTarget} onSuccess={() => setEditWarrantyTarget(null)} />
        )}
      </FormDrawer>

      <FormDrawer open={addWarrantyOpen} onOpenChange={setAddWarrantyOpen} title={t('warranties.addWarranty')}>
        <WarrantyForm defaultAssetId={assetId} onSuccess={() => setAddWarrantyOpen(false)} />
      </FormDrawer>

      <MoveResourceDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        type="asset"
        ids={[assetId]}
        recordLabel={asset?.name ?? ''}
      />

      <DuplicateResourceDialog
        open={dupeOpen}
        onOpenChange={setDupeOpen}
        type="asset"
        ids={[assetId]}
        recordLabel={asset?.name ?? ''}
      />
    </div>
  );
}

/** Move button — hidden when the org has only one accessible space. */
function MoveAssetButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  const { data } = useAccessibleSpaces();
  if ((data?.items?.length ?? 0) <= 1) return null;
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /><span className="ms-1">{t('move.button')}</span>
    </Button>
  );
}

/** Duplicate button — hidden when the org has only one accessible space. */
function DuplicateAssetButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  const { data } = useAccessibleSpaces();
  if ((data?.items?.length ?? 0) <= 1) return null;
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Copy aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /><span className="ms-1">{t('duplicate.button')}</span>
    </Button>
  );
}
