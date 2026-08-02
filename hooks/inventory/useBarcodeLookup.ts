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
export function useBarcodeLookup(opts?: { posLookup?: boolean }) {
  const qc = useQueryClient();
  const inFlight = useRef<Map<string, Promise<BarcodeLookupResult>>>(new Map());
  const posLookup = opts?.posLookup === true;

  const lookup = useCallback(
    async (rawCode: string): Promise<BarcodeLookupResult> => {
      const code = rawCode.trim();
      if (!code) return { found: false, code };

      const existing = inFlight.current.get(code);
      if (existing) return existing;

      const promise = (async () => {
        // Reuse the cached result only while it's still fresh. A price/stock edit
        // calls invalidateQueries(['inventory', ...]), which flags this entry as
        // invalidated; in that case we fall through and refetch so the register
        // sees the new price on the next scan without a page reload.
        const state = qc.getQueryState<BarcodeLookupResult>(['inventory', 'by-barcode', code]);
        if (state?.data && !state.isInvalidated) return state.data;

        const qs = new URLSearchParams({ code });
        if (posLookup) qs.set('posLookup', 'true');
        const res = await fetch(`/api/inventory/by-barcode?${qs.toString()}`);
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
    [qc, posLookup],
  );

  return { lookup };
}
