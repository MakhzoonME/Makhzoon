'use client';
import { useQuery } from '@tanstack/react-query';

export function useOrganizations(filters?: { search?: string; category?: string }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.category) params.set('category', filters.category);
  return useQuery({
    queryKey: ['organizations', filters],
    queryFn: async () => {
      const res = await fetch(`/api/organizations?${params.toString()}`);
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
