'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { APP_ENV } from '@/lib/app-env';

export default function AnalyticsIdentify() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user || APP_ENV !== 'production') return;

    const { uid, email, displayName, role, organizationId, orgSlug } = user;
    const traits = { email, name: displayName, role, organizationId: organizationId ?? undefined, orgSlug: orgSlug ?? undefined };

    // Heap
    const w = window as unknown as Record<string, unknown>;
    const heap = w.heap as { identify?: (id: string) => void; addUserProperties?: (p: Record<string, unknown>) => void } | undefined;
    if (heap?.identify) {
      heap.identify(uid);
      heap.addUserProperties?.(traits);
    }

    // LogRocket
    import('logrocket').then(({ default: LogRocket }) => {
      LogRocket.identify(uid, { name: traits.name, email: traits.email, role: traits.role });
    }).catch(() => {});

    // PostHog
    import('posthog-js').then(({ default: posthog }) => {
      posthog.identify(uid, traits);
    }).catch(() => {});

    // Microsoft Clarity
    const clarity = w.clarity as ((cmd: string, key: string, val?: string) => void) | undefined;
    if (clarity) {
      clarity('identify', uid);
      clarity('set', 'email', email);
    }

    // ContentSquare
    const uxa = w._uxa as unknown[] | undefined;
    if (Array.isArray(uxa)) {
      uxa.push(['setCustomVariable', 1, 'userId', uid, 3]);
      uxa.push(['setCustomVariable', 2, 'email', email, 3]);
    }
  }, [user]);

  return null;
}
