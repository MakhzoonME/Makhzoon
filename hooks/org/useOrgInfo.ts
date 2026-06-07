'use client';
import { useQuery } from '@tanstack/react-query';

export interface OrgInfo {
  id: string;
  name: string;
  subdomain: string;
  contactEmail: string;
  description: string | null;
  category: string | null;
  currency?: string;
  accountManager: { id: string; name: string; email: string } | null;
}

export function useOrgInfo() {
  return useQuery<OrgInfo | null>({
    queryKey: ['org-info-self'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/self');
      // 403 = staff without settings.orgInfo permission — degrade gracefully
      if (res.status === 403) return null;
      if (!res.ok) throw new Error('Failed to fetch organization info');
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
