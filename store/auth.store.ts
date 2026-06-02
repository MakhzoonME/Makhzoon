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
  /** Called after transfer mode is activated — re-fetches auth/me so the org context is current */
  refreshFromServer: () => Promise<void>;
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
          avatarUrl: data.avatarUrl ?? current.avatarUrl ?? null,
          features: data.features ?? {},
          permissions: data.permissions ?? current.permissions,
        },
      });
    } catch {
      // non-critical
    }
  },
  refreshFromServer: async () => {
    const current = get().user;
    if (!current) return;
    try {
      const res = await fetch('/api/auth/me', { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) return;
      const data = await res.json();
      set({
        user: {
          ...current,
          avatarUrl: data.avatarUrl ?? current.avatarUrl ?? null,
          displayName: data.displayName ?? current.displayName ?? '',
          role: data.role ?? current.role,
          organizationId: data.organizationId ?? current.organizationId,
          orgSlug: data.orgSlug ?? current.orgSlug,
          features: data.features ?? {},
          permissions: data.permissions ?? current.permissions,
        },
      });
    } catch {
      // non-critical
    }
  },
}));
