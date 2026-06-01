'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { InventoryAudit, InventoryAuditItem } from '@/types';

interface AuditsResponse { audits: InventoryAudit[] }
interface AuditDetailResponse { audit: InventoryAudit; items: InventoryAuditItem[] }

export function useInventoryAudits() {
  const { space } = useParams<{ space?: string }>();
  return useQuery<AuditsResponse>({
    queryKey: ['inventory-audits', space],
    enabled: !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch('/api/inventory/audits', { headers });
      if (!res.ok) throw new Error('Failed to fetch audits');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useInventoryAudit(auditId: string) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<AuditDetailResponse>({
    queryKey: ['inventory-audits', space, auditId],
    enabled: !!auditId && !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/inventory/audits/${auditId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch audit');
      return res.json();
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}
