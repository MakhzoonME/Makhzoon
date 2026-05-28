'use client';
import { useQuery } from '@tanstack/react-query';

export function useAssignableUsers() {
  return useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: async () => {
      const res = await fetch('/api/users?assignable=true');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}
