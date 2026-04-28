'use client';
import { useQuery } from '@tanstack/react-query';
import { Subscription } from '@/types';

export function useSubscription(orgId: string | null | undefined) {
  return useQuery<Subscription>({
    queryKey: ['subscription', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/subscription`);
      if (!res.ok) throw new Error('Failed to fetch subscription');
      return res.json();
    },
    enabled: !!orgId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
