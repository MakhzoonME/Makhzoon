'use client';
import { useQuery } from '@tanstack/react-query';

export function useRequests(params?: { status?: string; type?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.type) query.set('type', params.type);

  return useQuery({
    queryKey: ['requests', params],
    queryFn: async () => {
      const res = await fetch(`/api/requests?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch requests');
      return res.json();
    },
    staleTime: 30_000,
  });
}
