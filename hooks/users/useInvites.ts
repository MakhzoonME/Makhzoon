import { useQuery } from '@tanstack/react-query';
import type { Invite } from '@/types';

async function fetchInvites(): Promise<Invite[]> {
  const res = await fetch('/api/invites');
  if (!res.ok) throw new Error('Failed to fetch invites');
  return res.json();
}

export function useInvites() {
  return useQuery<Invite[]>({
    queryKey: ['invites'],
    queryFn: fetchInvites,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
