'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });
}
