'use client';
import { create } from 'zustand';
import { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  /** Re-fetches features + permissions from /api/auth/me and merges into current user */
  refreshFeatures: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  refreshFeatures: async () => {
    const current = get().user;
    if (!current) return;
    try {
      const res = await fetch('/api/auth/me', { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) return;
      const data = await res.json();
      set({
        user: {
          ...current,
          features: data.features ?? {},
          permissions: data.permissions ?? current.permissions,
        },
      });
    } catch {
      // non-critical
    }
  },
}));
