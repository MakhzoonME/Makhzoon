'use client';
import { useQuery } from '@tanstack/react-query';

export function useWarranties(params?: { status?: string; assetId?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.assetId) query.set('assetId', params.assetId);

  return useQuery({
    queryKey: ['warranties', params],
    queryFn: async () => {
      const res = await fetch(`/api/warranties?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch warranties');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useWarranty(id: string) {
  return useQuery({
    queryKey: ['warranties', id],
    queryFn: async () => {
      const res = await fetch(`/api/warranties/${id}`);
      if (!res.ok) throw new Error('Failed to fetch warranty');
      return res.json();
    },
    enabled: !!id,
  });
}
