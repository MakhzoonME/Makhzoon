'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAssets(params?: { status?: string; category?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);

  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const res = await fetch(`/api/assets?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json();
    },
    staleTime: 30_000,
    gcTime: 2 * 60_000,
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
