'use client';

import { useActiveSpaceStore } from '@/store/active-space.store';

let installed = false;

/**
 * Monkey-patch window.fetch so that every same-origin `/api/*` call
 * automatically carries `x-space-slug: <active-space>`.
 *
 * `resolveTenant()` reads this header to scope queries to the active space.
 * Cross-origin and non-/api/ calls are passed through untouched.
 *
 * Safe to call multiple times — only patches once per browser session.
 */
export function installSpaceFetchInterceptor(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const slug = useActiveSpaceStore.getState().slug;
    if (!slug) return original(input, init);

    let pathname = '';
    try {
      if (typeof input === 'string') {
        pathname = input.startsWith('/')
          ? input
          : new URL(input, window.location.origin).pathname;
      } else if (input instanceof URL) {
        pathname = input.pathname;
      } else if (input instanceof Request) {
        pathname = new URL(input.url, window.location.origin).pathname;
      }
    } catch {
      return original(input, init);
    }

    if (!pathname.startsWith('/api/')) return original(input, init);

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    if (!headers.has('x-space-slug')) headers.set('x-space-slug', slug);

    return original(input, { ...init, headers });
  };
}
