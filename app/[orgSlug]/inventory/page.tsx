'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useInventoryItems, useInventoryCategories } from '@/hooks/useInventory';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { InventoryItemForm } from '@/components/inventory/InventoryItemForm';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { InventoryItem } from '@/types';
import { RequestInventoryModal } from '@/components/inventory/RequestInventoryModal';
function PlusSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function EditSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /></svg>; }
function Trash2SVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function AlertTriangleSVG({ size = 16 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /><path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function ClipboardCheckSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 2v1.5h4V2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M5.5 8.5l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function PlusCircleSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function MinusCircleSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M4.5 7h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function RequestSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M4 5h6M4 7.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
import { cn } from '@/lib/utils/cn';

function StockBadge({ status, qty, unit }: { status: InventoryItem['stockStatus']; qty: number; unit: string }) {
  const map = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    low: 'bg-amber-50 text-amber-700 border-amber-200',
    out: 'bg-red-50 text-red-700 border-red-200',
  };
  const label = { ok: 'In Stock', low: 'Low Stock', out: 'Out of Stock' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium', map[status])}>
      {status === 'low' && <AlertTriangleSVG size={12} />}
      {qty} {unit} · {label[status]}
    </span>
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [reqTarget, setReqTarget] = useState<InventoryItem | null>(null);
  const [adjusting, setAdjusting] = useState<Map<string, 'in' | 'out'>>(new Map());

  const debouncedSearch = useDebounce(search, 400);
  const { data, isLoading } = useInventoryItems({ category: category || undefined, stockStatus: stockFilter || undefined, search: debouncedSearch });
  const { data: categories } = useInventoryCategories();
  const items = data?.items ?? [];

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const columns: ColumnDef<InventoryItem>[] = [
    {
      key: 'name', header: 'Item',
      render: (i) => (
        <div>
          <button className="font-medium text-indigo-600 hover:underline text-left" onClick={() => router.push(`/${orgSlug}/inventory/${i.id}`)}>
            {i.name}
          </button>
          {i.sku && <div className="text-xs text-gray-400 font-mono">{i.sku}</div>}
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (i) => i.category },
    {
      key: 'stock', header: 'Stock',
      render: (i) => <StockBadge status={i.stockStatus} qty={i.quantityOnHand} unit={i.unit} />,
    },
    { key: 'threshold', header: 'Min. Threshold', render: (i) => <span className="text-sm text-gray-600">{i.minimumThreshold} {i.unit}</span> },
    { key: 'location', header: 'Location', render: (i) => i.location || <span className="text-gray-400">—</span> },
    { key: 'supplier', header: 'Supplier', render: (i) => i.supplier || <span className="text-gray-400">—</span> },
    {
      key: 'actions', header: '',
      render: (i) => (
        <div className="flex items-center gap-1">
          {isAdmin && (
            <>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditTarget(i); setDrawerOpen(true); }}>
                <EditSVG />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteTarget(i); }}>
                <Trash2SVG />
              </Button>
              <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" disabled={adjusting.has(i.id)} onClick={(e) => { e.stopPropagation(); quickAdjust(i.id, 'in'); }}>
                {adjusting.get(i.id) === 'in' ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <PlusCircleSVG />}
              </Button>
              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-500 hover:bg-red-50" disabled={adjusting.has(i.id)} onClick={(e) => { e.stopPropagation(); quickAdjust(i.id, 'out'); }}>
                {adjusting.get(i.id) === 'out' ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <MinusCircleSVG />}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); setReqTarget(i); }}>
            <RequestSVG />
          </Button>
        </div>
      ),
    },
  ];

  async function quickAdjust(itemId: string, type: 'in' | 'out') {
    setAdjusting((prev) => new Map(prev).set(itemId, type));
    try {
      const res = await fetch(`/api/inventory/${itemId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, quantity: 1, reason: 'Quick adjustment' }),
      });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ['inventory'] });
    } catch {
      toast.error('Failed to adjust stock');
    } finally {
      setAdjusting((prev) => { const n = new Map(prev); n.delete(itemId); return n; });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Item deleted');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setDeleting(false);
    }
  }

  const lowCount = items.filter((i) => i.stockStatus === 'low').length;
  const outCount = items.filter((i) => i.stockStatus === 'out').length;

  return (
    <div>
      <PageHeader
        title="Inventory"
        actions={isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push(`/${orgSlug}/inventory/audits`)}>
              <ClipboardCheckSVG /> Audits
            </Button>
            <Button size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}>
              <PlusSVG /><span className="ml-1">Add Item</span>
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => router.push(`/${orgSlug}/inventory/audits`)}>
            <ClipboardCheckSVG /> Audits
          </Button>
        )}
      />

      {(lowCount > 0 || outCount > 0) && (
        <div className="mb-4 flex gap-3 flex-wrap">
          {outCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangleSVG />
              <span><strong>{outCount}</strong> item{outCount > 1 ? 's' : ''} out of stock</span>
            </div>
          )}
          {lowCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertTriangleSVG />
              <span><strong>{lowCount}</strong> item{lowCount > 1 ? 's' : ''} running low</span>
            </div>
          )}
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search items..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <div className="flex items-center gap-2">
            <Select value={category || 'all'} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(categories ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stockFilter || 'all'} onValueChange={(v) => setStockFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Stock" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="ok">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={items}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No inventory items found."
          onRowClick={(i) => router.push(`/${orgSlug}/inventory/${i.id}`)}
          keyExtractor={(i) => i.id}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Item"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(o) => { setDrawerOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? 'Edit Item' : 'Add Inventory Item'}
        width="xl"
      >
        <InventoryItemForm
          item={editTarget ?? undefined}
          onSuccess={() => setDrawerOpen(false)}
        />
      </FormDrawer>

      <RequestInventoryModal
        open={!!reqTarget}
        onOpenChange={(o) => !o && setReqTarget(null)}
        itemId={reqTarget?.id ?? ''}
        itemName={reqTarget?.name ?? ''}
      />
    </div>
  );
}
