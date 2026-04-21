'use client';
import { useQuery } from '@tanstack/react-query';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await fetch('/api/organizations');
      if (!res.ok) throw new Error('Failed to fetch organizations');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${id}`);
      if (!res.ok) throw new Error('Failed to fetch organization');
      return res.json();
    },
    enabled: !!id,
  });
}
