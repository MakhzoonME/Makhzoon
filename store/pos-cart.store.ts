'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartLineInput } from '@/lib/modules/haraka/pricing/calc';
import type { PosCustomer } from '@/types';

/** Normalized shape accepted by addItem — a Raseed InventoryItem (product) or a HarakaService. */
export interface PosPickableItem {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unitPrice: number;
  taxRateId?: string | null;
}

/**
 * Cart state for the Haraka register. Persisted to sessionStorage so a held
 * or in-progress cart survives navigating away and back within the same
 * tab — but still cleared when the tab closes, so a stale cart can't ring
 * up a sale tomorrow with yesterday's prices.
 */
export interface HeldCart {
  id: string;
  lines: CartLineInput[];
  customer: { id: string; name: string } | null;
  heldAt: Date;
}

interface PosCartState {
  lines: CartLineInput[];
  customer: { id: string; name: string } | null;
  held: HeldCart[];
  /** Add or increment-existing by itemId. Snapshots price/tax at add-time. */
  addItem: (item: PosPickableItem, taxRate: number) => void;
  /** Set absolute qty for a line. Qty<=0 removes. */
  setQty: (itemId: string, qty: number) => void;
  /** Increment current qty by delta (can be negative). */
  incQty: (itemId: string, delta: number) => void;
  setLineDiscount: (itemId: string, discount: number) => void;
  removeLine: (itemId: string) => void;
  clear: () => void;
  setCustomer: (c: PosCustomer | null) => void;
  /** Save current cart to hold list and clear active cart. */
  holdCart: () => void;
  /** Restore a held cart into the active cart (replaces current). */
  recallCart: (id: string) => void;
  /** Discard a held cart without recalling. */
  discardHeld: (id: string) => void;
}

export const usePosCart = create<PosCartState>()(
  persist(
    (set) => ({
  lines: [],
  customer: null,
  held: [],
  addItem: (item, taxRate) =>
    set((state) => {
      const idx = state.lines.findIndex((l) => l.itemId === item.id);
      if (idx >= 0) {
        const next = [...state.lines];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return { lines: next };
      }
      const line: CartLineInput = {
        itemId: item.id,
        itemName: item.name,
        sku: item.sku ?? null,
        barcode: item.barcode ?? null,
        quantity: 1,
        unitPrice: item.unitPrice,
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
  holdCart: () =>
    set((state) => {
      if (state.lines.length === 0) return state;
      const held: HeldCart = {
        id: crypto.randomUUID(),
        lines: [...state.lines],
        customer: state.customer,
        heldAt: new Date(),
      };
      return { held: [...state.held, held], lines: [], customer: null };
    }),
  recallCart: (id) =>
    set((state) => {
      const cart = state.held.find((h) => h.id === id);
      if (!cart) return state;
      return {
        lines: cart.lines,
        customer: cart.customer,
        held: state.held.filter((h) => h.id !== id),
      };
    }),
  discardHeld: (id) =>
    set((state) => ({ held: state.held.filter((h) => h.id !== id) })),
    }),
    {
      name: 'pos-cart',
      storage: createJSONStorage(() => sessionStorage, {
        reviver: (key, value) => (key === 'heldAt' ? new Date(value as string) : value),
      }),
      partialize: (state) => ({ lines: state.lines, customer: state.customer, held: state.held }),
    },
  ),
);
