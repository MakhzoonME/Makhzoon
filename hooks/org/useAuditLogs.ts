'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { AuditLog } from '@/types';

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AuditLogsParams {
  orgId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  /** `'space'` (default) restricts to the active space. `'all'` returns logs across every accessible space. */
  scope?: 'space' | 'all';
}

export function useAuditLogs(params?: AuditLogsParams) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.orgId) query.set('orgId', params.orgId);
  if (params?.userId) query.set('userId', params.userId);
  if (params?.action) query.set('action', params.action);
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.scope === 'all') query.set('allSpaces', 'true');

  return useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', space, params],
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/audit-logs?${query.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    staleTime: 30_000,
  });
}
