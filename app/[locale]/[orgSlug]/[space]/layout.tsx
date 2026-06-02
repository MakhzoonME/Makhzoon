'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useActiveSpaceStore } from '@/store/active-space.store';
import { installSpaceFetchInterceptor } from '@/lib/utils/space-fetch';

/**
 * Space-scoped route segment.
 *
 *  - Syncs `params.space` (URL) into the active-space store.
 *  - Installs the fetch interceptor that injects `x-space-slug` on /api/*.
 *
 * PR-3 keeps the slug validation server-side (resolveTenant rejects an
 * inaccessible slug with 403). A future pass can add a client-side guard
 * here that 404s before the page even renders.
 */
export default function SpaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ space?: string }>();
  const slug = (params?.space as string) || null;
  const setSlug = useActiveSpaceStore((s) => s.setSlug);
  const currentSlug = useActiveSpaceStore((s) => s.slug);

  // Sync slug synchronously during render so the fetch interceptor has it
  // before any child useQuery fires on the first render.
  if (currentSlug !== slug) {
    setSlug(slug);
  }

  // Install once per browser session.
  useEffect(() => {
    installSpaceFetchInterceptor();
  }, []);

  return <>{children}</>;
}
