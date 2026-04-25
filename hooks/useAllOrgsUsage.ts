'use client';
import { useQuery } from '@tanstack/react-query';
import type { OrgWithUsage } from '@/types';

export function useAllOrgsUsage(filters?: { search?: string; category?: string }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.category) params.set('category', filters.category);
  return useQuery<OrgWithUsage[]>({
    queryKey: ['all-orgs-usage', filters],
    queryFn: async () => {
      const res = await fetch(`/api/admin/usage?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch all orgs usage');
      return res.json();
    },
  });
}
