'use client';
import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInventoryAudit } from '@/hooks/inventory';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';

import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryAudit, InventoryAuditItem } from '@/types';
import { ArrowLeft, CheckCircle2, XCircle, Clock, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type AuditCache = { audit: InventoryAudit; items: InventoryAuditItem[] };

function ItemRow({ item, auditId, space, completed }: { item: InventoryAuditItem; auditId: string; space: string; completed: boolean }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [pendingAction, setPendingAction] = useState<'found' | 'missing' | null>(null);
  const submitting = useRef(false);
  const queryKey = ['inventory-audits', space, auditId];

  const markMutation = useMutation({
    mutationFn: async ({ status, note: n }: { status: 'found' | 'missing'; note: string }) => {
      const res = await fetch(`/api/inventory/audits/${auditId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditItemId: item.id, status, note: n }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json().catch(() => ({}));
    },
    // Optimistic: flip the row's status + adjust counters immediately so the
    // row moves to "Checked" and the buttons disappear on click.
    onMutate: async ({ status, note: n }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<AuditCache>(queryKey);
      if (prev) {
        const wasPending = item.status === 'pending';
        const wasFound = item.status === 'found';
        const wasMissing = item.status === 'missing';
        const audit: InventoryAudit = { ...prev.audit };
        if (wasPending) {
          audit.pendingCount = Math.max(0, audit.pendingCount - 1);
          if (status === 'found') audit.foundCount += 1;
          else audit.missingCount += 1;
        } else if (wasFound && status === 'missing') {
          audit.foundCount = Math.max(0, audit.foundCount - 1);
          audit.missingCount += 1;
        } else if (wasMissing && status === 'found') {
          audit.missingCount = Math.max(0, audit.missingCount - 1);
          audit.foundCount += 1;
        }
        const items = prev.items.map((it) =>
          it.id === item.id ? { ...it, status, note: n || it.note } : it,
        );
        qc.setQueryData<AuditCache>(queryKey, { audit, items });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error('Failed to update');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      setPendingAction(null);
      submitting.current = false;
    },
  });

  function mark(status: 'found' | 'missing') {
    if (submitting.current) return;
    submitting.current = true;
    setPendingAction(status);
    markMutation.mutate({ status, note });
  }

  const isPending = item.status === 'pending';
  const busy = markMutation.isPending || submitting.current;

  return (
    <div className={cn(
      'flex items-center gap-4 px-5 py-3 border-b border-border last:border-0',
      item.status === 'found' && 'bg-emerald-500/10',
      item.status === 'missing' && 'bg-red-500/10',
    )}>
      <div className="flex-shrink-0 w-6">
        {item.status === 'found' && <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />}
        {item.status === 'missing' && <XCircle className="h-4 w-4 text-red-500" strokeWidth={1.75} />}
        {item.status === 'pending' && <Clock className="h-4 w-4 text-gray-400" strokeWidth={1.75} />}
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
            disabled={busy}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            disabled={busy}
            onClick={() => mark('found')}
          >
            {pendingAction === 'found' ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
            )}
            <span className="ms-1">Found</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
            disabled={busy}
            onClick={() => mark('missing')}
          >
            {pendingAction === 'missing' ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <XCircle className="h-4 w-4" strokeWidth={1.75} />
            )}
            <span className="ms-1">Missing</span>
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
  const space = useSpace();
  const { locale } = useT();
  const qc = useQueryClient();
  const { data, isLoading } = useInventoryAudit(auditId);
  const [completing, setCompleting] = useState(false);
  const [search, setSearch] = useState('');

  const auditsHref = `/${locale}/${orgSlug}/${space}/usool/audits`;

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <div className="p-6 text-gray-500">Audit not found.</div>;

  const { audit, items } = data;
  const completed = audit.status === 'completed';

  // Derive counts from actual item statuses so stale audit counters don't mislead.
  const actualFound = items.filter((i) => i.status === 'found').length;
  const actualMissing = items.filter((i) => i.status === 'missing').length;
  const actualPending = items.filter((i) => i.status === 'pending').length;
  const total = items.length;
  const pct = total ? Math.round(((actualFound + actualMissing) / total) * 100) : 0;

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
      qc.invalidateQueries({ queryKey: ['inventory-audits', space, auditId] });
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
        breadcrumb={[{ label: 'Usool', href: `/${locale}/${orgSlug}/${space}/usool` }, { label: 'Audits', href: `/${locale}/${orgSlug}/${space}/usool/audits` }, { label: audit.title, href: `/${locale}/${orgSlug}/${space}/usool/audits/${auditId}` }]}
        actions={
          completed ? (
            <Button size="sm" onClick={() => router.push(auditsHref)}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              <span className="ms-1">Back to Audits</span>
            </Button>
          ) : actualPending === 0 ? (
            <Button size="sm" onClick={handleComplete} disabled={completing}>
              <CheckCheck className="h-4 w-4" strokeWidth={1.75} />
              <span className="ms-1">{completing ? 'Completing...' : 'Complete Audit'}</span>
            </Button>
          ) : undefined
        }
      />

      {/* Progress bar */}
      <div className="bg-surface-card rounded-lg border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-6 text-sm">
            <span><strong className="text-gray-900">{total}</strong> <span className="text-gray-400">total</span></span>
            <span><strong className="text-emerald-600">{actualFound}</strong> <span className="text-gray-400">found</span></span>
            <span><strong className="text-red-500">{actualMissing}</strong> <span className="text-gray-400">missing</span></span>
            <span><strong className="text-gray-400">{actualPending}</strong> <span className="text-gray-400">pending</span></span>
          </div>
          <span className="text-sm font-semibold text-gray-700">{pct}% checked</span>
        </div>
        <div className="h-2 bg-surface-page rounded-full overflow-hidden flex border border-border">
          <div className="h-2 bg-emerald-500 transition-all" style={{ width: `${total ? (actualFound / total) * 100 : 0}%` }} />
          <div className="h-2 bg-red-400 transition-all" style={{ width: `${total ? (actualMissing / total) * 100 : 0}%` }} />
        </div>
        {completed && (
          <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> Audit completed
            </span>
            <Button size="sm" variant="outline" onClick={() => router.push(auditsHref)}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              <span className="ms-1">Back to Audits</span>
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets..." className="max-w-xs" />
      </div>

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="bg-surface-card rounded-lg border border-border mb-4">
          <div className="px-5 py-3 border-b border-border text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Pending ({pending.length})
          </div>
          {pending.map((item) => (
            <ItemRow key={item.id} item={item} auditId={auditId} space={space} completed={completed} />
          ))}
        </div>
      )}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="bg-surface-card rounded-lg border border-border">
          <div className="px-5 py-3 border-b border-border text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Checked ({checked.length})
          </div>
          {checked.map((item) => (
            <ItemRow key={item.id} item={item} auditId={auditId} space={space} completed={completed} />
          ))}
        </div>
      )}
    </div>
  );
}
