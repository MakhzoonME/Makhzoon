'use client';

import { create } from 'zustand';
import type { CartLineInput } from '@/lib/modules/haraka/pricing/calc';
import type { InventoryItem, PosCustomer } from '@/types';

/**
 * Cart state for the Haraka register. Intentionally NOT persisted: closing
 * the tab clears the cart. We don't want a stale cart to ring up a sale
 * tomorrow with yesterday's prices.
 */
interface PosCartState {
  lines: CartLineInput[];
  customer: { id: string; name: string } | null;
  /** Add or increment-existing by itemId. Snapshots price/tax at add-time. */
  addItem: (item: InventoryItem, taxRate: number) => void;
  /** Set absolute qty for a line. Qty<=0 removes. */
  setQty: (itemId: string, qty: number) => void;
  /** Increment current qty by delta (can be negative). */
  incQty: (itemId: string, delta: number) => void;
  setLineDiscount: (itemId: string, discount: number) => void;
  removeLine: (itemId: string) => void;
  clear: () => void;
  setCustomer: (c: PosCustomer | null) => void;
}

export const usePosCart = create<PosCartState>((set) => ({
  lines: [],
  customer: null,
  addItem: (item, taxRate) =>
    set((state) => {
      const idx = state.lines.findIndex((l) => l.itemId === item.id);
      if (idx >= 0) {
        const next = [...state.lines];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return { lines: next };
      }
      const unitPrice =
        typeof item.posPrice === 'number' && item.posPrice > 0
          ? item.posPrice
          : item.unitCost ?? 0;
      const line: CartLineInput = {
        itemId: item.id,
        itemName: item.name,
        sku: item.sku ?? null,
        barcode: item.barcode ?? null,
        quantity: 1,
        unitPrice,
        taxRate,
        taxRateId: item.taxRateId ?? null,
        discount: 0,
      };
      return { lines: [...state.lines, line] };
    }),
  setQty: (itemId, qty) =>
    set((state) => ({
      lines: qty <= 0 ? state.lines.filter((l) => l.itemId !== itemId) : state.lines.map((l) => l.itemId === itemId ? { ...l, quantity: qty } : l),
    })),
  incQty: (itemId, delta) =>
    set((state) => {
      const next = state.lines.map((l) =>
        l.itemId === itemId ? { ...l, quantity: l.quantity + delta } : l,
      );
      return { lines: next.filter((l) => l.quantity > 0) };
    }),
  setLineDiscount: (itemId, discount) =>
    set((state) => ({
      lines: state.lines.map((l) => (l.itemId === itemId ? { ...l, discount: Math.max(0, discount) } : l)),
    })),
  removeLine: (itemId) => set((state) => ({ lines: state.lines.filter((l) => l.itemId !== itemId) })),
  clear: () => set({ lines: [], customer: null }),
  setCustomer: (c) => set({ customer: c ? { id: c.id, name: c.name } : null }),
}));
