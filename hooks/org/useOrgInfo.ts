'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

export interface OrgInfo {
  id: string;
  name: string;
  subdomain: string;
  contactEmail: string;
  description: string | null;
  category: string | null;
  currency: string;
  accountManager: { id: string; name: string; email: string } | null;
}

const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin']);

export function useOrgInfo() {
  const user = useAuthStore((s) => s.user);
  const canFetch =
    !!user &&
    (ADMIN_ROLES.has(user.role) ||
      (user.role === 'staff' && user.permissions?.settings?.orgInfo === true));

  return useQuery<OrgInfo | null>({
    queryKey: ['org-info-self'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/self');
      if (!res.ok) throw new Error('Failed to fetch organization info');
      return res.json();
    },
    enabled: canFetch,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
