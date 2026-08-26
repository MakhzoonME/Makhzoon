'use client';

import { create } from 'zustand';
import { readSavedPrinter, clearSavedPrinter, pairPrinter as transportPair } from '@/lib/modules/haraka/printing/webusb-transport';

/**
 * Local-only WebUSB device pairing state. Paper size, copies, and cut feed
 * are NOT here — they're org-wide settings (ReceiptConfig, saved server-side)
 * so every register prints the same way regardless of which computer it's
 * on. Only which physical USB device this browser talks to is inherently
 * per-machine.
 */
interface PrinterState {
  paired: boolean;
  vendorId: number | null;
  productId: number | null;
  hydrate: () => void;
  pair: () => Promise<void>;
  unpair: () => void;
}

export const usePrinterStore = create<PrinterState>((set) => ({
  paired: false,
  vendorId: null,
  productId: null,
  hydrate: () => {
    const saved = readSavedPrinter();
    if (saved) {
      set({ paired: true, vendorId: saved.vendorId, productId: saved.productId });
    } else {
      set({ paired: false, vendorId: null, productId: null });
    }
  },
  pair: async () => {
    const saved = await transportPair();
    set({ paired: true, vendorId: saved.vendorId, productId: saved.productId });
  },
  unpair: () => {
    clearSavedPrinter();
    set({ paired: false, vendorId: null, productId: null });
  },
}));
