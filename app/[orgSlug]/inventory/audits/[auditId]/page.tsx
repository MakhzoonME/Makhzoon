'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInventoryAudit } from '@/hooks/useInventoryAudits';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { InventoryAuditItem } from '@/types';
function CheckCircle2SVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" /><path d="M5 8l2.5 2.5 4-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function XCircleSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function ClockSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" /><path d="M8 4.5V8.5l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function CheckCheckSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M1.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 9l2 2 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
import { cn } from '@/lib/utils/cn';

function ItemRow({ item, auditId, completed }: { item: InventoryAuditItem; auditId: string; completed: boolean }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function mark(status: 'found' | 'missing') {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/audits/${auditId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditItemId: item.id, status, note }),
      });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ['inventory-audits', auditId] });
    } catch {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  }

  const isPending = item.status === 'pending';

  return (
    <div className={cn(
      'flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0',
      item.status === 'found' && 'bg-emerald-50/40',
      item.status === 'missing' && 'bg-red-50/40',
    )}>
      <div className="flex-shrink-0 w-6">
        {item.status === 'found' && <CheckCircle2SVG />}
        {item.status === 'missing' && <XCircleSVG />}
        {item.status === 'pending' && <ClockSVG />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900">{item.assetName}</div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span>{item.assetCategory}</span>
          {item.assetSerial && <span className="font-mono">{item.assetSerial}</span>}
          {item.assetLocation && <span>{item.assetLocation}</span>}
          {item.assetAssignedTo && <span>→ {item.assetAssignedTo}</span>}
        </div>
        {item.note && <div className="text-xs text-gray-500 italic mt-0.5">{item.note}</div>}
      </div>
      {!completed && isPending && (
        <div className="flex items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="h-7 text-xs w-36"
          />
          <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50" disabled={loading} onClick={() => mark('found')}>
            <CheckCircle2SVG /><span className="ml-1">Found</span>
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" disabled={loading} onClick={() => mark('missing')}>
            <XCircleSVG /><span className="ml-1">Missing</span>
          </Button>
        </div>
      )}
      {!completed && !isPending && (
        <span className={cn('text-xs font-medium', item.status === 'found' ? 'text-emerald-600' : 'text-red-500')}>
          {item.status === 'found' ? 'Found' : 'Missing'}
        </span>
      )}
    </div>
  );
}

export default function AuditDetailPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const qc = useQueryClient();
  const { data, isLoading } = useInventoryAudit(auditId);
  const [completing, setCompleting] = useState(false);
  const [search, setSearch] = useState('');

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <div className="p-6 text-gray-500">Audit not found.</div>;

  const { audit, items } = data;
  const completed = audit.status === 'completed';
  const pct = audit.totalAssets ? Math.round(((audit.foundCount + audit.missingCount) / audit.totalAssets) * 100) : 0;

  const filtered = search
    ? items.filter((i) =>
        i.assetName.toLowerCase().includes(search.toLowerCase()) ||
        (i.assetSerial ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (i.assetLocation ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const pending = filtered.filter((i) => i.status === 'pending');
  const checked = filtered.filter((i) => i.status !== 'pending');

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/inventory/audits/${auditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Audit completed');
      qc.invalidateQueries({ queryKey: ['inventory-audits', auditId] });
      qc.invalidateQueries({ queryKey: ['inventory-audits'] });
    } catch {
      toast.error('Failed to complete audit');
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={audit.title}
        breadcrumb={[{ label: 'Inventory', href: '/inventory' }, { label: 'Audits', href: '/inventory/audits' }, { label: audit.title, href: `/inventory/audits/${auditId}` }]}
        actions={!completed && audit.pendingCount === 0 ? (
          <Button size="sm" onClick={handleComplete} disabled={completing}>
            <CheckCheckSVG /><span className="ml-1">{completing ? 'Completing...' : 'Complete Audit'}</span>
          </Button>
        ) : undefined}
      />

      {/* Progress bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-6 text-sm">
            <span><strong className="text-gray-900">{audit.totalAssets}</strong> <span className="text-gray-400">total</span></span>
            <span><strong className="text-emerald-600">{audit.foundCount}</strong> <span className="text-gray-400">found</span></span>
            <span><strong className="text-red-500">{audit.missingCount}</strong> <span className="text-gray-400">missing</span></span>
            <span><strong className="text-gray-400">{audit.pendingCount}</strong> <span className="text-gray-400">pending</span></span>
          </div>
          <span className="text-sm font-semibold text-gray-700">{pct}% checked</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="h-2 bg-emerald-500 transition-all" style={{ width: `${audit.totalAssets ? (audit.foundCount / audit.totalAssets) * 100 : 0}%` }} />
          <div className="h-2 bg-red-400 transition-all" style={{ width: `${audit.totalAssets ? (audit.missingCount / audit.totalAssets) * 100 : 0}%` }} />
        </div>
        {completed && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2SVG /> Audit completed
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets..." className="max-w-xs" />
      </div>

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <div className="px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Pending ({pending.length})
          </div>
          {pending.map((item) => (
            <ItemRow key={item.id} item={item} auditId={auditId} completed={completed} />
          ))}
        </div>
      )}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Checked ({checked.length})
          </div>
          {checked.map((item) => (
            <ItemRow key={item.id} item={item} auditId={auditId} completed={completed} />
          ))}
        </div>
      )}
    </div>
  );
}
