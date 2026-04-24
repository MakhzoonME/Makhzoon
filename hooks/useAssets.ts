'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { Asset } from '@/types';

interface AssetsResponse {
  items: Asset[];
  nextCursor: string | null;
}

export function useAssets(params?: { status?: string; category?: string; search?: string; cursor?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.cursor) query.set('cursor', params.cursor);

  return useQuery<AssetsResponse>({
    queryKey: ['assets', params],
    queryFn: async () => {
      const res = await fetch(`/api/assets?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json() as Promise<AssetsResponse>;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${id}`);
      if (!res.ok) throw new Error('Failed to fetch asset');
      return res.json();
    },
    enabled: !!id,
    staleTime: 60_000,
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
    staleTime: 10 * 60_000,
  });
}
