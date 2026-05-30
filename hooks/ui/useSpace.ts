'use client';
import { useParams } from 'next/navigation';

/**
 * Active space slug for the current route.
 *
 * Inside `[space]/…` pages, returns `params.space`. Outside (org-wide pages
 * like /settings or /users), falls back to `'default'` — every org has a
 * Default space (auto-created in Script 2), so this is always a valid slug.
 *
 * Once PR-3 lands (tenant-context resolution), the fallback may instead
 * read the user's last-visited space from auth state.
 */
export function useSpace(): string {
  const params = useParams<{ space?: string }>();
  return (params?.space as string) || 'default';
}
