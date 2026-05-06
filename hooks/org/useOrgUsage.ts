'use client';
import { useQuery } from '@tanstack/react-query';
import { OrgUsage } from '@/types';

export function useOrgUsage(orgId: string | null | undefined) {
  return useQuery<OrgUsage>({
    queryKey: ['org-usage', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/usage`);
      if (!res.ok) throw new Error('Failed to fetch usage');
      return res.json();
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
