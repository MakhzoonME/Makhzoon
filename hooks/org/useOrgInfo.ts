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

export function useOrgInfo() {
  const user = useAuthStore((s) => s.user);
  // Basic org identity (name, currency, etc.) is shown to every user across
  // the app regardless of role — breadcrumbs, receipts, the org switcher.
  // Editing it is still restricted server-side (settingsOrgInfo.view / admin
  // roles), this hook is read-only.

  return useQuery<OrgInfo | null>({
    queryKey: ['org-info-self'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/self');
      if (!res.ok) throw new Error('Failed to fetch organization info');
      return res.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
