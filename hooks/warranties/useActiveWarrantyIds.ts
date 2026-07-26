'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

interface ActiveWarrantyIds {
  assetIds: string[];
  inventoryItemIds: string[];
}

/**
 * Lightweight query that returns only the IDs of assets and inventory items
 * that have at least one active warranty.  Used by WarrantyForm to compute
 * which items are eligible for a NEW warranty without loading all warranty
 * objects into the browser.
 */
export function useActiveWarrantyIds() {
  const { space } = useParams<{ space?: string }>();

  return useQuery<ActiveWarrantyIds>({
    queryKey: ['warranties', 'active-ids', space],
    enabled: !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch('/api/warranties/active-ids', { headers });
      if (!res.ok) throw new Error('Failed to fetch active warranty IDs');
      return res.json();
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
  });
}
