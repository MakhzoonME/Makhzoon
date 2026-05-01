'use client';
import { useQuery } from '@tanstack/react-query';
import { AuditLog } from '@/types';

interface AuditLogsParams {
  orgId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
}

export function useAuditLogs(params?: AuditLogsParams) {
  const query = new URLSearchParams();
  if (params?.orgId) query.set('orgId', params.orgId);
  if (params?.userId) query.set('userId', params.userId);
  if (params?.action) query.set('action', params.action);
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  if (params?.cursor) query.set('cursor', params.cursor);

  return useQuery<{ logs: AuditLog[]; nextCursor: string | null }>({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    staleTime: 30_000,
  });
}
