'use client';
import { create } from 'zustand';

interface ActiveSpaceState {
  /** Slug of the currently-active space, or null when outside a [space] route. */
  slug: string | null;
  setSlug: (s: string | null) => void;
}

/**
 * Holds the active space slug for the current page. Synced from the URL
 * `[space]` segment by `<ActiveSpaceSync />` and read by the fetch wrapper
 * (`installSpaceFetchInterceptor`) to attach `x-space-slug` to /api/* calls.
 */
export const useActiveSpaceStore = create<ActiveSpaceState>((set) => ({
  slug: null,
  setSlug: (slug) => set({ slug }),
}));
