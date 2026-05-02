'use client';
import { useQuery } from '@tanstack/react-query';

interface RequestsResponse {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useRequests(params?: {
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.type) query.set('type', params.type);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortDir) query.set('sortDir', params.sortDir);

  return useQuery<RequestsResponse>({
    queryKey: ['requests', params],
    queryFn: async () => {
      const res = await fetch(`/api/requests?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch requests');
      return res.json();
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
  });
}
