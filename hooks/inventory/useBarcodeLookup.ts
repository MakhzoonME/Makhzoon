'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { InventoryItem } from '@/types';

export type BarcodeLookupResult =
  | { found: true; item: InventoryItem }
  | { found: false; code: string };

/**
 * Imperative barcode → inventory item lookup. Returns a `lookup(code)` function
 * the caller can fire from a scanner's onResolve callback. Results are cached
 * in React Query (60s) so repeated scans of the same code in a session are free.
 *
 * The hook is imperative (not a useQuery) because the caller often wants to
 * react to the result inline (add to cart, fill purchase line, etc.) — not
 * subscribe to a watcher.
 */
export function useBarcodeLookup() {
  const qc = useQueryClient();
  const inFlight = useRef<Map<string, Promise<BarcodeLookupResult>>>(new Map());

  const lookup = useCallback(
    async (rawCode: string): Promise<BarcodeLookupResult> => {
      const code = rawCode.trim();
      if (!code) return { found: false, code };

      const existing = inFlight.current.get(code);
      if (existing) return existing;

      const promise = (async () => {
        const cached = qc.getQueryData<BarcodeLookupResult>(['inventory', 'by-barcode', code]);
        if (cached) return cached;

        const res = await fetch(`/api/inventory/by-barcode?code=${encodeURIComponent(code)}`);
        if (res.status === 404) {
          const miss: BarcodeLookupResult = { found: false, code };
          qc.setQueryData(['inventory', 'by-barcode', code], miss, { updatedAt: Date.now() });
          return miss;
        }
        if (!res.ok) {
          throw new Error('Barcode lookup failed');
        }
        const data = (await res.json()) as { item: InventoryItem };
        const hit: BarcodeLookupResult = { found: true, item: data.item };
        qc.setQueryData(['inventory', 'by-barcode', code], hit, { updatedAt: Date.now() });
        return hit;
      })();

      inFlight.current.set(code, promise);
      try {
        return await promise;
      } finally {
        inFlight.current.delete(code);
      }
    },
    [qc],
  );

  return { lookup };
}
