'use client';
import { useQuery } from '@tanstack/react-query';
import type { OrganizationConfig } from '@/types';

export function useOrgConfig(orgId: string | undefined) {
  return useQuery<OrganizationConfig>({
    queryKey: ['org-config', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/config`);
      if (!res.ok) throw new Error('Failed to load configuration');
      return res.json();
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
