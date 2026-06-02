'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInventoryItem, useInventoryTransactions } from '@/hooks/inventory';
import { useWarranties } from '@/hooks/warranties';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { InventoryTransaction, Warranty } from '@/types';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DocumentList } from '@/components/shared';
import { useOrgInfo } from '@/hooks/org';
import { RequestInventoryModal } from '@/components/inventory/RequestInventoryModal';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pencil, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, ArrowRight, Copy } from 'lucide-react';
import { MoveResourceDialog } from '@/components/spaces/MoveResourceDialog';
import { DuplicateResourceDialog } from '@/components/spaces/DuplicateResourceDialog';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { formatDate, isExpired, getWarrantyStatus } from '@/lib/utils/date';

/* ── Icons ───────────────────────────────────────────────────────── */
function BoxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 8L12 3 3 8v8l9 5 9-5V8z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M3 8l9 5 9-5M12 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function LoaderSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.8" />
      <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function PlusSVG() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
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

/* ── Stock status bar ────────────────────────────────────────────── */
function StockStatusBar({ qty, threshold }: { qty: number; threshold: number }) {
  const pct   = threshold === 0 ? 100 : Math.min(100, (qty / (threshold * 3)) * 100);
  const color = qty === 0 ? 'bg-red-500' : qty < threshold ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="w-full bg-surface-page rounded-full h-2 overflow-hidden">
      <div className={cn('h-2 rounded-full transition-[width] duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Transaction type badge ──────────────────────────────────────── */
function TxBadge({ type, t }: { type: 'in' | 'out' | 'adjustment'; t: (k: Parameters<ReturnType<typeof useT>['t']>[0]) => string }) {
  const styles = {
    in:         'bg-[var(--green-100)] text-[var(--green-700)] border-[var(--green-100)]',
    out:        'bg-[var(--red-100)] text-[var(--red-700)] border-[var(--red-100)]',
    adjustment: 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border-[var(--yellow-100)]',
  }[type];
  const label = {
    in:         t('inventory.stockIn'),
    out:        t('inventory.stockOut'),
    adjustment: t('inventory.setAbsolute'),
  }[type];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium', styles)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
      {label}
    </span>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function InventoryItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router      = useRouter();
  const orgSlug     = useOrgSlug();
  const space       = useSpace();
  const { t, locale } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { user }    = useAuthStore();
  const qc          = useQueryClient();

  const { data: item, isLoading }             = useInventoryItem(itemId);
  const { data: txData,  isLoading: txLoading } = useInventoryTransactions(itemId);
  const { data: warrantiesResponse, isLoading: wLoading } = useWarranties({ inventoryItemId: itemId });
  const transactions = txData?.transactions ?? [];
  const warranties   = warrantiesResponse?.items ?? [];

  const [txFilter, setTxFilter]   = useState<'all' | 'in' | 'out' | 'adjustment'>('all');
  const [txType, setTxType]       = useState<'in' | 'out' | 'adjustment'>('in');
  const [txQty, setTxQty]         = useState('');
  const [txReason, setTxReason]   = useState('');
  const [txNote, setTxNote]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [moveOpen, setMoveOpen]   = useState(false);
  const [dupeOpen, setDupeOpen]   = useState(false);
  const [reqOpen, setReqOpen]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [editWarrantyTarget, setEditWarrantyTarget] = useState<Warranty | null>(null);
  const [addWarrantyOpen, setAddWarrantyOpen]       = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        const key =
          body.code === 'INVENTORY_DELETE_OPEN_REQUESTS'   ? 'inventory.deleteBlockedOpenRequests'
          : body.code === 'INVENTORY_DELETE_ACTIVE_WARRANTY' ? 'inventory.deleteBlockedActiveWarranty'
          : null;
        toast.error(key ? t(key) : (body.error || t('inventory.itemDeleteFailed')));
        return;
      }
      toast.success(t('inventory.itemDeleted'));
      qc.invalidateQueries({ queryKey: ['inventory'] });
      router.push(`/${locale}/${orgSlug}/${space}/raseed`);
    } catch {
      toast.error(t('inventory.itemDeleteFailed'));
    } finally {
      setDeleting(false);
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

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!txQty || !txReason) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: txType, quantity: Number(txQty), reason: txReason, note: txNote }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('inventory.updateStock'));
      setTxQty('');
      setTxReason('');
      setTxNote('');
      qc.invalidateQueries({ queryKey: ['inventory', itemId] });
      qc.invalidateQueries({ queryKey: ['inventory-transactions', itemId] });
    } catch {
      toast.error(t('inventory.itemDeleteFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (!item) return (
    <ErrorState
      title={t('inventory.itemNotFound')}
      message={t('inventory.itemNotFoundDesc')}
      hint={t('inventory.itemNotFoundHint')}
      action={{ label: t('inventory.backToInventory'), onClick: () => router.push(`/${locale}/${orgSlug}/${space}/raseed`) }}
    />
  );

  const stockColor = item.stockStatus === 'ok'  ? 'text-[var(--green-700)] bg-[var(--green-100)] border-[var(--green-100)]'
    : item.stockStatus === 'low' ? 'text-[var(--yellow-700)] bg-[var(--yellow-100)] border-[var(--yellow-100)]'
    : 'text-[var(--red-700)] bg-[var(--red-100)] border-[var(--red-100)]';

  const stockNumColor = item.stockStatus === 'ok' ? 'text-[var(--green-700)]'
    : item.stockStatus === 'low' ? 'text-amber-500'
    : 'text-red-600';

  const filteredTx = txFilter === 'all'
    ? transactions
    : transactions.filter((tx: InventoryTransaction) => tx.type === txFilter);

  const TX_TABS: { key: typeof txFilter; label: string }[] = [
    { key: 'all',        label: t('inventory.txAll')     },
    { key: 'in',         label: t('inventory.stockIn')   },
    { key: 'out',        label: t('inventory.stockOut')  },
    { key: 'adjustment', label: t('inventory.setAbsolute') },
  ];

  return (
    <div>
      <PageHeader
        title={item.name}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.inventory'), href: `/${locale}/${orgSlug}/${space}/raseed/list` },
          { label: item.name, href: `/${locale}/${orgSlug}/${space}/raseed/${itemId}` },
        ]}
        actions={(
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setReqOpen(true)} className="cursor-pointer transition-colors duration-150">
              {t('inventory.requestRefill')}
            </Button>
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={() => router.push(`/${locale}/${orgSlug}/${space}/raseed/${itemId}/edit`)} className="cursor-pointer transition-colors duration-150">
                  <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('common.edit')}</span>
                </Button>
                <MoveInventoryButton onClick={() => setMoveOpen(true)} />
                <DuplicateInventoryButton onClick={() => setDupeOpen(true)} />
                <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(true)} className="cursor-pointer transition-colors duration-150">
                  {t('inventory.deleteItem')}
                </Button>
              </>
            )}
          </div>
        )}
      />

      {/* ── Item identity banner ───────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-surface-card rounded-xl border border-border">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-xl"
          style={{ width: 48, height: 48, background: 'color-mix(in srgb, var(--mod-raseed) 14%, var(--surface-card))', color: 'var(--mod-raseed)' }}
        >
          <BoxIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-900 truncate">{item.name}</h2>
          {item.sku && <p className="text-xs text-gray-400 font-mono mt-0.5">{item.sku}</p>}
        </div>
        <span className={cn('px-2.5 py-0.5 rounded-full border text-xs font-medium flex-shrink-0', stockColor)}>
          {item.stockStatus === 'ok' ? t('inventory.inStock') : item.stockStatus === 'low' ? t('inventory.lowStock') : t('inventory.outOfStock')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: info + movements + warranties ─────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stock level card */}
          <div className="bg-surface-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">{t('inventory.stockLevel')}</h3>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className={`text-5xl font-bold leading-none tabular-nums ${stockNumColor}`}>
                {item.quantityOnHand}
              </span>
              <span className="text-base text-gray-400 mb-1">{item.unit}</span>
            </div>
            <StockStatusBar qty={item.quantityOnHand} threshold={item.minimumThreshold} />
            <p className="mt-2 text-xs text-gray-400">
              {t('inventory.minThresholdHint')}: {item.minimumThreshold} {item.unit}
            </p>
          </div>

          {/* Item details card */}
          <div className="bg-surface-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('assetDetail.detailsTitle')}</h3>
            <KVRow label={t('col.category')}>{item.category}</KVRow>
            {item.sku && <KVRow label={t('inventory.sku')}><span className="font-mono text-xs">{item.sku}</span></KVRow>}
            <KVRow label={t('inventory.onHand')}>
              <span className={`font-semibold tabular-nums ${stockNumColor}`}>{item.quantityOnHand} {item.unit}</span>
            </KVRow>
            <KVRow label={t('inventory.threshold')}>{item.minimumThreshold} {item.unit}</KVRow>
            {item.reorderQuantity != null && (
              <KVRow label={t('inventory.reorderQty')}>{item.reorderQuantity} {item.unit}</KVRow>
            )}
            {item.unitCost != null && (
              <KVRow label={t('inventory.unitCost')}>
                <span className="font-mono tabular-nums">{item.unitCost.toFixed(3)} JOD</span>
              </KVRow>
            )}
            {item.location && <KVRow label={t('col.location')}>{item.location}</KVRow>}
            {item.supplier && <KVRow label={t('inventory.supplier')}>{item.supplier}</KVRow>}
            {item.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('col.notes')}</p>
                <p className="text-sm text-gray-700 bg-surface-page rounded-lg p-3 leading-relaxed border border-border">{item.notes}</p>
              </div>
            )}
            {item.documents && item.documents.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <DocumentList value={item.documents} label="Purchase receipts / invoices" />
              </div>
            )}
          </div>

          {/* Transaction history */}
          <div className="bg-surface-card rounded-xl border border-border">
            {/* Header + segment tabs */}
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('inventory.txHistory')}</h3>
              <div className="flex gap-1">
                {TX_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setTxFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150 ${
                      txFilter === tab.key
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-surface-page'
                    }`}
                  >
                    {tab.label}
                    {tab.key !== 'all' && (
                      <span className={`ms-1.5 tabular-nums ${txFilter === tab.key ? 'opacity-80' : 'text-gray-400'}`}>
                        ({transactions.filter((tx: InventoryTransaction) => tx.type === tab.key).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {txLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="h-4 w-16 bg-surface-sidebar rounded animate-pulse" />
                    <div className="h-4 flex-1 bg-surface-sidebar rounded animate-pulse" />
                    <div className="h-4 w-12 bg-surface-sidebar rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredTx.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">{t('inventory.noTransactions')}</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredTx.map((tx: InventoryTransaction) => (
                  <div key={tx.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-page transition-colors duration-100">
                    <TxBadge type={tx.type} t={t} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700 truncate">{tx.reason}</span>
                      </div>
                      {tx.note && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-gray-400 truncate cursor-default">{tx.note}</p>
                            </TooltipTrigger>
                            <TooltipContent>{tx.note}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {tx.performedByName || tx.performedByEmail} · <span className="tabular-nums font-mono">{formatDate(tx.performedAt)}</span>
                      </p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className={cn('text-sm font-bold tabular-nums',
                        tx.type === 'in' ? 'text-[var(--green-700)]'
                        : tx.type === 'out' ? 'text-red-600'
                        : 'text-primary-600')}>
                        {tx.type === 'in' ? '+' : tx.type === 'out' ? '−' : ''}{tx.quantity} {item.unit}
                      </p>
                      <p className="text-xs text-gray-400 tabular-nums font-mono">{tx.quantityBefore} → {tx.quantityAfter}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warranties */}
          <Card>
            <CardContent className="p-0">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{t('assetDetail.tabWarranty')}</h3>
                {isAdmin && (() => {
                  const now = new Date();
                  const hasActive = warranties.some((w) => new Date(w.endDate) >= now);
                  return !hasActive ? (
                    <Button size="sm" variant="ghost" className="cursor-pointer transition-colors duration-150" onClick={() => setAddWarrantyOpen(true)}>
                      <PlusSVG /><span className="ms-1">{t('warranties.addWarranty')}</span>
                    </Button>
                  ) : null;
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
        </div>

        {/* ── Right: stock alert + adjust form ────────────────────── */}
        {isAdmin && (
          <div className="space-y-5">
            {/* Alert banner */}
            {item.stockStatus !== 'ok' && (
              <div className={cn('flex items-start gap-2.5 p-4 rounded-xl border text-sm', stockColor)}>
                <AlertTriangle aria-hidden className="h-4 w-4 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>
                  {item.stockStatus === 'out'
                    ? t('inventory.outOfStockAlert')
                    : `${t('inventory.lowStockAlert')} (${item.quantityOnHand} ${t('inventory.remaining')} ${item.minimumThreshold}).`}
                </span>
              </div>
            )}

            {/* Adjust stock form */}
            <div className="bg-surface-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('inventory.adjustStock')}</h3>
              <form onSubmit={handleTransaction} className="space-y-4">

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('inventory.txType')}</label>
                  <Select value={txType} onValueChange={(v) => setTxType(v as typeof txType)}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">
                        <span className="flex items-center gap-2 text-[var(--green-700)]">
                          <TrendingUp aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {t('inventory.stockIn')}
                        </span>
                      </SelectItem>
                      <SelectItem value="out">
                        <span className="flex items-center gap-2 text-red-600">
                          <TrendingDown aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {t('inventory.stockOut')}
                        </span>
                      </SelectItem>
                      <SelectItem value="adjustment">
                        <span className="flex items-center gap-2 text-primary-600">
                          <RefreshCw aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {t('inventory.setAbsolute')}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {txType === 'adjustment' ? `${t('inventory.txQty')} (${item.unit}) — ${t('inventory.setAbsolute')}` : `${t('inventory.txQty')} (${item.unit})`}
                  </label>
                  <Input type="number" min="1" value={txQty} onChange={(e) => setTxQty(e.target.value)} placeholder="0" required />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('inventory.txReason')} *</label>
                  <Input value={txReason} onChange={(e) => setTxReason(e.target.value)} placeholder="e.g. Received from supplier" required />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('inventory.txNoteOptional')}</label>
                  <Input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder={t('inventory.additionalDetails')} />
                </div>

                <Button type="submit" className="w-full cursor-pointer transition-colors duration-150" disabled={submitting}>
                  {submitting
                    ? <span className="inline-flex items-center gap-2"><LoaderSVG />{t('common.saving')}</span>
                    : t('inventory.updateStock')}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(false)}
        title={t('inventory.deleteItem')}
        description={`${t('common.delete')} "${item.name}"?`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        loading={deleting}
      />

      <RequestInventoryModal
        open={reqOpen}
        onOpenChange={setReqOpen}
        itemId={item.id}
        itemName={item.name}
      />

      <FormDrawer open={!!editWarrantyTarget} onOpenChange={(o) => { if (!o) setEditWarrantyTarget(null); }} title={t('warranties.editWarranty')}>
        {editWarrantyTarget && <WarrantyForm warranty={editWarrantyTarget} onSuccess={() => setEditWarrantyTarget(null)} />}
      </FormDrawer>

      <FormDrawer open={addWarrantyOpen} onOpenChange={setAddWarrantyOpen} title={t('warranties.addWarranty')}>
        <WarrantyForm defaultInventoryItemId={item.id} onSuccess={() => setAddWarrantyOpen(false)} />
      </FormDrawer>

      <MoveResourceDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        type="inventory"
        ids={[item.id]}
        recordLabel={item.name}
        availableQty={item.quantityOnHand}
        unit={item.unit}
      />

      <DuplicateResourceDialog
        open={dupeOpen}
        onOpenChange={setDupeOpen}
        type="inventory"
        ids={[item.id]}
        recordLabel={item.name}
      />
    </div>
  );
}

function MoveInventoryButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  const { data } = useAccessibleSpaces();
  if ((data?.items?.length ?? 0) <= 1) return null;
  return (
    <Button size="sm" variant="outline" onClick={onClick} className="cursor-pointer transition-colors duration-150">
      <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('move.button')}</span>
    </Button>
  );
}

function DuplicateInventoryButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  const { data } = useAccessibleSpaces();
  if ((data?.items?.length ?? 0) <= 1) return null;
  return (
    <Button size="sm" variant="outline" onClick={onClick} className="cursor-pointer transition-colors duration-150">
      <Copy aria-hidden className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('duplicate.button')}</span>
    </Button>
  );
}
