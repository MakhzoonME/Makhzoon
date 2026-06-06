'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { Request } from '@/types';

export function useRequest(requestId: string | undefined) {
  const { space } = useParams<{ space?: string }>();

  return useQuery<Request>({
    queryKey: ['request', space, requestId],
    enabled: !!space && !!requestId,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/requests/${requestId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch request');
      return res.json();
    },
    staleTime: 0,
  });
}
