'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TransferState {
  active: boolean;
  orgId: string | null;
  orgName: string | null;
  subdomain: string | null;
  setTransfer: (orgId: string, orgName: string, subdomain?: string | null) => void;
  clearTransfer: () => void;
}

export const useTransferStore = create<TransferState>()(
  persist(
    (set) => ({
      active: false,
      orgId: null,
      orgName: null,
      subdomain: null,
      setTransfer: (orgId, orgName, subdomain = null) =>
        set({ active: true, orgId, orgName, subdomain }),
      clearTransfer: () => set({ active: false, orgId: null, orgName: null, subdomain: null }),
    }),
    {
      name: 'transfer-state',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
