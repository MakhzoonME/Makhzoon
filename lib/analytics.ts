'use client';
import { APP_ENV } from '@/lib/app-env';

type Properties = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsUser {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
  orgSlug?: string;
  organizationId?: string | null;
}

const enabled = APP_ENV === 'production';

function heap(): Record<string, (...args: unknown[]) => void> | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>).heap as Record<string, (...args: unknown[]) => void> | undefined ?? null;
}

function clarity(): ((...args: unknown[]) => void) | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>).clarity as ((...args: unknown[]) => void) | undefined ?? null;
}

export const analytics = {
  identify(user: AnalyticsUser): void {
    if (!enabled || typeof window === 'undefined') return;

    const traits = {
      email: user.email,
      name: user.displayName,
      role: user.role,
      org_slug: user.orgSlug,
      organization_id: user.organizationId ?? null,
    };

    import('posthog-js').then(({ default: posthog }) => {
      posthog.identify(user.uid, traits);
    }).catch(() => {});

    import('logrocket').then(({ default: LogRocket }) => {
      LogRocket.identify(user.uid, {
        name: user.displayName ?? '',
        email: user.email ?? '',
        role: user.role ?? '',
        orgSlug: user.orgSlug ?? '',
      });
    }).catch(() => {});

    // Heap / Clarity are synchronous globals — a throw here (e.g. Heap's
    // "environment id is missing") must not bubble into the caller (login).
    try {
      const h = heap();
      if (h) {
        h.identify?.(user.uid);
        h.addUserProperties?.(traits);
      }

      // Microsoft Clarity custom user ID
      clarity()?.('identify', user.uid, undefined, undefined, user.email ?? '');
    } catch (err) {
      console.warn('[analytics] identify failed (non-fatal):', err);
    }
  },

  track(event: string, properties?: Properties): void {
    if (!enabled || typeof window === 'undefined') return;

    import('posthog-js').then(({ default: posthog }) => {
      posthog.capture(event, properties);
    }).catch(() => {});

    try {
      const h = heap();
      h?.track?.(event, properties as never);
    } catch (err) {
      console.warn('[analytics] track failed (non-fatal):', err);
    }
  },

  reset(): void {
    if (!enabled || typeof window === 'undefined') return;

    import('posthog-js').then(({ default: posthog }) => {
      posthog.reset();
    }).catch(() => {});

    try {
      heap()?.resetIdentity?.();
    } catch (err) {
      console.warn('[analytics] reset failed (non-fatal):', err);
    }
  },
};
