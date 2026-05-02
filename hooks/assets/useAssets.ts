'use client';
import { useQuery } from '@tanstack/react-query';
import type { Asset } from '@/types';

interface AssetsResponse {
  items: Asset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useAssets(params?: {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortDir) query.set('sortDir', params.sortDir);

  return useQuery<AssetsResponse>({
    queryKey: ['assets', params],
    queryFn: async () => {
      const res = await fetch(`/api/assets?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json() as Promise<AssetsResponse>;
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
  });
}

export function useAsset(id: string) {
  return useQuery<Asset>({
    queryKey: ['assets', id],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${id}`);
      if (!res.ok) throw new Error('Failed to fetch asset');
      return res.json();
    },
    enabled: !!id,
    staleTime: 0,
    gcTime: 5 * 60_000,
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const res = await fetch('/api/assets?categoriesOnly=true');
      if (!res.ok) return [];
      const data = await res.json();
      return data.categories ?? [];
    },
    staleTime: 5 * 60_000,
  });
}
