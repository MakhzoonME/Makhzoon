'use client';
import { useParams } from 'next/navigation';
import { useActiveSpaceStore } from '@/store/active-space.store';

/**
 * Active space slug for the current route.
 *
 * Inside `[space]/…` pages, returns `params.space`.
 * On org-level pages (settings, support) where there is no `[space]` segment,
 * falls back to the last active slug from the store so sidebar links keep
 * pointing at the same space the user was in before navigating away.
 * Ultimate fallback is `'default'` for fresh sessions.
 */
export function useSpace(): string {
  const params = useParams<{ space?: string }>();
  const storeSlug = useActiveSpaceStore((s) => s.slug);
  return (params?.space as string) || storeSlug || 'default';
}
