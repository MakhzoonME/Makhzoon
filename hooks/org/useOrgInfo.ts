'use client';
import { useQuery } from '@tanstack/react-query';

export interface OrgInfo {
  id: string;
  name: string;
  subdomain: string;
  contactEmail: string;
  description: string | null;
  category: string | null;
  accountManager: { name: string; email: string } | null;
}

export function useOrgInfo() {
  return useQuery<OrgInfo>({
    queryKey: ['org-info-self'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/self');
      if (!res.ok) throw new Error('Failed to fetch organization info');
      return res.json();
    },
    staleTime: 60_000,
  });
}
