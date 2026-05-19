'use client';

import { create } from 'zustand';
import { readSavedPrinter, clearSavedPrinter, savePrinter, pairPrinter as transportPair } from '@/lib/modules/haraka/printing/webusb-transport';

interface PrinterState {
  paperWidth: 58 | 80;
  copies: number;
  paired: boolean;
  vendorId: number | null;
  productId: number | null;
  hydrate: () => void;
  pair: () => Promise<void>;
  unpair: () => void;
  setPaperWidth: (w: 58 | 80) => void;
  setCopies: (c: number) => void;
}

export const usePrinterStore = create<PrinterState>((set, get) => ({
  paperWidth: 80,
  copies: 1,
  paired: false,
  vendorId: null,
  productId: null,
  hydrate: () => {
    const saved = readSavedPrinter();
    if (saved) {
      set({
        paired: true,
        vendorId: saved.vendorId,
        productId: saved.productId,
        paperWidth: saved.paperWidth,
        copies: saved.copies,
      });
    } else {
      set({ paired: false, vendorId: null, productId: null });
    }
  },
  pair: async () => {
    const s = get();
    const saved = await transportPair(s.paperWidth, s.copies);
    set({ paired: true, vendorId: saved.vendorId, productId: saved.productId });
  },
  unpair: () => {
    clearSavedPrinter();
    set({ paired: false, vendorId: null, productId: null });
  },
  setPaperWidth: (w) => {
    const s = get();
    if (s.paired && s.vendorId && s.productId) {
      savePrinter({ vendorId: s.vendorId, productId: s.productId, paperWidth: w, copies: s.copies });
    }
    set({ paperWidth: w });
  },
  setCopies: (c) => {
    const s = get();
    const copies = Math.max(1, c);
    if (s.paired && s.vendorId && s.productId) {
      savePrinter({ vendorId: s.vendorId, productId: s.productId, paperWidth: s.paperWidth, copies });
    }
    set({ copies });
  },
}));
