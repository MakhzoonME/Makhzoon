'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Request } from '@/types';

interface RequestsResponse {
  items: Request[];
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
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.type) query.set('type', params.type);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortDir) query.set('sortDir', params.sortDir);

  return useQuery<RequestsResponse>({
    queryKey: ['requests', space, params],
    enabled: !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/requests?${query.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch requests');
      return res.json();
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
  });
}
