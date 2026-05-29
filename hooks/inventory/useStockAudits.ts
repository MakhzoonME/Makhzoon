'use client';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type {
  StockAudit,
  StockAuditAdjustment,
  StockAuditItem,
} from '@/types/stock-audit.types';

interface AuditsResponse {
  audits: StockAudit[];
}

interface AuditDetailResponse {
  audit: StockAudit;
  items: StockAuditItem[];
}

const LIST_KEY: QueryKey = ['stock-audits'];
const detailKey = (id: string): QueryKey => ['stock-audits', id];

export function useStockAudits() {
  return useQuery<AuditsResponse>({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const res = await fetch('/api/inventory/stock-audits');
      if (!res.ok) throw new Error('Failed to fetch stock audits');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useStockAudit(auditId: string) {
  return useQuery<AuditDetailResponse>({
    queryKey: detailKey(auditId),
    queryFn: async () => {
      const res = await fetch(`/api/inventory/stock-audits/${auditId}`);
      if (!res.ok) throw new Error('Failed to fetch stock audit');
      return res.json();
    },
    enabled: !!auditId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export interface CreateStockAuditPayload {
  title: string;
  notes?: string;
  itemIds: string[];
}

export function useCreateStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateStockAuditPayload) => {
      const res = await fetch('/api/inventory/stock-audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === 'string' ? err.error : 'Failed to create stock audit',
        );
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export interface SubmitStockAuditItemPayload {
  auditItemId: string;
  countedQuantity: number;
  note?: string;
}

/**
 * Submits a counted quantity for a single audit row. Performs an optimistic
 * cache update on `['stock-audits', auditId]` so the row flips to "counted"
 * and the audit counters refresh immediately. Mirrors the asset-audit flow
 * from commit 09906fc.
 */
export function useSubmitStockAuditItem(auditId: string) {
  const qc = useQueryClient();
  const queryKey = detailKey(auditId);

  return useMutation({
    mutationFn: async (body: SubmitStockAuditItemPayload) => {
      const res = await fetch(`/api/inventory/stock-audits/${auditId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === 'string' ? err.error : 'Failed to submit count',
        );
      }
      return res.json();
    },
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<AuditDetailResponse>(queryKey);
      if (!prev) return { prev };

      const target = prev.items.find((it) => it.id === body.auditItemId);
      if (!target) return { prev };

      const expected = target.expectedQuantity;
      const wasCounted = target.status === 'counted';
      const prevAbs =
        wasCounted && target.countedQuantity != null
          ? Math.abs(target.countedQuantity - expected)
          : 0;
      const nextAbs = Math.abs(body.countedQuantity - expected);

      const audit: StockAudit = {
        ...prev.audit,
        countedCount: prev.audit.countedCount + (wasCounted ? 0 : 1),
        pendingCount: Math.max(0, prev.audit.pendingCount + (wasCounted ? 0 : -1)),
        varianceTotal: prev.audit.varianceTotal - prevAbs + nextAbs,
      };

      const items = prev.items.map((it) =>
        it.id === body.auditItemId
          ? {
              ...it,
              countedQuantity: body.countedQuantity,
              note: body.note ?? it.note,
              status: 'counted' as const,
              checkedAt: new Date(),
            }
          : it,
      );

      qc.setQueryData<AuditDetailResponse>(queryKey, { audit, items });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export interface CompleteStockAuditPayload {
  adjustments: Record<string, StockAuditAdjustment>;
}

export function useCompleteStockAudit(auditId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CompleteStockAuditPayload) => {
      const res = await fetch(`/api/inventory/stock-audits/${auditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', adjustments: body.adjustments }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === 'string' ? err.error : 'Failed to complete audit',
        );
      }
      return res.json() as Promise<{ ok: true; applied: number }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey(auditId) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
