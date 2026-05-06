'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useWarranties } from '@/hooks/useWarranties';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExportButton } from '@/components/shared/ExportButton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warranty } from '@/types';
import { formatDate, isExpired, getWarrantyStatus } from '@/lib/utils/date';
import { useT } from '@/hooks/useT';
function PlusSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function EditSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /></svg>; }
function Trash2SVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function CheckSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
import { FormDrawer } from '@/components/shared/FormDrawer';
import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';

/* ── SVG icons ───────────────────────────────────────────────────── */
function PlusSVG()   { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function EditSVG()   { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /></svg>; }
function Trash2SVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function CheckSVG()  { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function AlertSVG()  { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M9 2L1.5 15h15L9 2z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" /><path d="M9 8v3.5M9 13.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>; }
function ArrowRightSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

/* ── Expiry warning banner ───────────────────────────────────────── */
function ExpiryBanner({ warranties }: { warranties: Warranty[] }) {
  const expiringSoon = warranties.filter((w) => {
    const d = daysUntil(w.endDate);
    return d >= 0 && d <= 90;
  });
  const expired = warranties.filter((w) => daysUntil(w.endDate) < 0);

  if (expiringSoon.length === 0 && expired.length === 0) return null;

  const count = expiringSoon.length + expired.length;
  const soonestDays = expiringSoon.length > 0
    ? Math.min(...expiringSoon.map((w) => daysUntil(w.endDate)))
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20">
      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex-shrink-0">
        <AlertSVG />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          {count === 1 ? '1 warranty needs attention' : `${count} warranties need attention`}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
          {soonestDays !== null
            ? `Soonest expires in ${soonestDays} day${soonestDays === 1 ? '' : 's'}${expired.length > 0 ? ` · ${expired.length} already expired` : ''}`
            : `${expired.length} warranty${expired.length > 1 ? 'ies' : 'y'} expired`}
        </p>
      </div>
      <button className="flex-shrink-0 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 flex items-center gap-1 transition-colors">
        Review <ArrowRightSVG />
      </button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function WarrantiesPage() {
  const { t } = useT();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Warranty | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<Warranty | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { data: warranties = [], isLoading } = useWarranties() as { data: Warranty[]; isLoading: boolean };
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  // Derive page subtitle
  const active       = warranties.filter((w: Warranty) => daysUntil(w.endDate) > 90).length;
  const expiringSoon = warranties.filter((w: Warranty) => { const d = daysUntil(w.endDate); return d >= 0 && d <= 90; }).length;
  const expired      = warranties.filter((w: Warranty) => daysUntil(w.endDate) < 0).length;

  // Client-side filtering
  const filtered = warranties.filter((w: Warranty) => {
    const warrantyStatus = getWarrantyStatus(w.endDate);
    if (statusFilter === 'active' && warrantyStatus !== 'Active') return false;
    if (statusFilter === 'expiring' && warrantyStatus !== 'Expires This Week' && warrantyStatus !== 'Expires This Month' && warrantyStatus !== 'Expires Next Month') return false;
    if (statusFilter === 'expired' && !isExpired(w.endDate)) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!(w.assetName ?? w.assetId ?? '').toLowerCase().includes(q) && !w.vendor.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const columns: ColumnDef<Warranty>[] = [
    { key: 'assetId', header: t('col.asset'), render: (w) => <button className="text-indigo-600 hover:underline" onClick={() => router.push(`/${orgSlug}/assets/${w.assetId}`)}>{w.assetName ?? w.assetId}</button> },
    { key: 'vendor', header: t('col.vendor'), render: (w) => w.vendor },
    { key: 'startDate', header: t('warranties.startDate'), render: (w) => formatDate(w.startDate) },
    { key: 'endDate', header: t('warranties.endDate'), render: (w) => <span className={isExpired(w.endDate) ? 'text-red-600' : ''}>{formatDate(w.endDate)}</span> },
    { key: 'reminder', header: t('warranties.reminder'), render: (w) => w.reminder ? <span className="text-green-600"><CheckSVG /></span> : <span className="text-gray-400">—</span> },
    { key: 'status', header: t('col.status'), render: (w) => <StatusBadge status={getWarrantyStatus(w.endDate)} /> },
    {
      key: 'actions', header: t('col.actions'),
      render: (w) => (
        <div className="flex gap-1">
          {isAdmin ? (
            <>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditTarget(w); setDrawerOpen(true); }}><EditSVG /></Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteTarget(w); }}><Trash2SVG /></Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => router.push(`/${orgSlug}/assets/${w.assetId}`)}>{t('warranties.viewAsset')}</Button>
          )}
        </div>
      )
    },
  ];

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/warranties/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success(t('warranties.warrantyDeleted'));
      qc.invalidateQueries({ queryKey: ['warranties'] });
      setDeleteTarget(null);
    } catch { toast.error(t('warranties.warrantyDeleteFailed')); }
    finally { setDeleting(false); }
  }

  const subtitle = [
    active > 0 ? `${active} active` : null,
    expiringSoon > 0 ? `${expiringSoon} expiring within 90 days` : null,
    expired > 0 ? `${expired} expired` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.warranties')}
        actions={isAdmin ? <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}><PlusSVG /><span className="ml-1">{t('warranties.addWarranty')}</span></Button> : undefined}
      />

      {/* ── Expiry warning banner ──────────────────────────────────── */}
      {!isLoading && <ExpiryBanner warranties={warranties} />}

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <FilterBar
        searchPlaceholder="Search by asset or vendor…"
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring">Expiring soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable data={warranties} columns={columns} isLoading={isLoading} emptyMessage={t('warranties.noWarranties')} keyExtractor={(w) => w.id} />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('warranties.deleteWarranty')}
        description={t('warranties.deleteWarrantyDesc').replace('{vendor}', deleteTarget?.vendor ?? '')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        loading={deleting}
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(o) => { setDrawerOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? t('warranties.editWarranty') : t('warranties.addWarranty')}
      >
        <WarrantyForm
          warranty={editTarget ?? undefined}
          onSuccess={() => setDrawerOpen(false)}
        />
      </FormDrawer>
    </div>
  );
}
