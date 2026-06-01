'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Warranty } from '@/types';

interface WarrantiesResponse {
  items: Warranty[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useWarranties(params?: {
  status?: string;
  assetId?: string;
  inventoryItemId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.assetId) query.set('assetId', params.assetId);
  if (params?.inventoryItemId) query.set('inventoryItemId', params.inventoryItemId);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortDir) query.set('sortDir', params.sortDir);

  return useQuery<WarrantiesResponse>({
    queryKey: ['warranties', space, params],
    enabled: !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/warranties?${query.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch warranties');
      return res.json();
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
  });
}

export function useWarranty(id: string) {
  const { space } = useParams<{ space?: string }>();
  return useQuery({
    queryKey: ['warranties', space, id],
    enabled: !!id && !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/warranties/${id}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch warranty');
      return res.json();
    },
  });
}
