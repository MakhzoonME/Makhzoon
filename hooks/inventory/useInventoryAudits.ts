'use client';
import { useQuery } from '@tanstack/react-query';
import type { InventoryAudit, InventoryAuditItem } from '@/types';

interface AuditsResponse { audits: InventoryAudit[] }
interface AuditDetailResponse { audit: InventoryAudit; items: InventoryAuditItem[] }

export function useInventoryAudits() {
  return useQuery<AuditsResponse>({
    queryKey: ['inventory-audits'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/audits');
      if (!res.ok) throw new Error('Failed to fetch audits');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useInventoryAudit(auditId: string) {
  return useQuery<AuditDetailResponse>({
    queryKey: ['inventory-audits', auditId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/audits/${auditId}`);
      if (!res.ok) throw new Error('Failed to fetch audit');
      return res.json();
    },
    enabled: !!auditId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}
