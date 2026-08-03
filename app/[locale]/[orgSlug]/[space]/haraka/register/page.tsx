'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCurrentSession } from '@/hooks/haraka';

/**
 * Legacy flat register route. The register now lives under its session at
 * `…/haraka/sessions/{sessionId}/register`, so this page just resolves the
 * cashier's current open session and forwards there — keeping every existing
 * "Open register" entry point working and ending on the canonical URL.
 */
export default function RegisterRedirectPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data, isLoading, isFetched } = useCurrentSession();

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const session = data?.session ?? null;

  useEffect(() => {
    if (!isFetched || isLoading) return;
    if (session) {
      router.replace(`${base}/sessions/${session.id}/register`);
    } else {
      router.replace(`${base}/sessions`);
    }
  }, [isFetched, isLoading, session, router, base]);

  return null;
}
