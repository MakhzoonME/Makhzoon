'use client';
import { useQuery } from '@tanstack/react-query';
import type { ListKey, ResolvedListItem } from '@/types';

/** Effective dropdown items for the current org (platform defaults + org
 *  overrides). Single source for every config-driven <ConfigSelect />. */
export function useList(listKey: ListKey) {
  return useQuery<ResolvedListItem[]>({
    queryKey: ['list', listKey],
    queryFn: async () => {
      const res = await fetch(`/api/lists/${listKey}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load list: ${listKey}`);
      const body = await res.json();
      return (body.items ?? []) as ResolvedListItem[];
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
