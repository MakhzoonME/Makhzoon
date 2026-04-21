'use client';
import { create } from 'zustand';

interface TransferState {
  active: boolean;
  orgId: string | null;
  orgName: string | null;
  setTransfer: (orgId: string, orgName: string) => void;
  clearTransfer: () => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  active: false,
  orgId: null,
  orgName: null,
  setTransfer: (orgId, orgName) => set({ active: true, orgId, orgName }),
  clearTransfer: () => set({ active: false, orgId: null, orgName: null }),
}));
