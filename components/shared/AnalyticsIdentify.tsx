'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { APP_ENV } from '@/lib/app-env';

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome/') && !ua.includes('Chromium')) return 'Chrome';
  if (ua.includes('Chromium/')) return 'Chromium';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  return 'Unknown';
}

export default function AnalyticsIdentify() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user || APP_ENV !== 'production') return;

    // Analytics is a best-effort side channel: a throw from any third-party
    // SDK (e.g. Heap's "environment id is missing") must never propagate to
    // React's error boundary and crash the page.
    try {
    const { uid, email, displayName, role, organizationId, orgSlug } = user;

    const browserLanguage = navigator.language || 'unknown';
    const deviceType = getDeviceType();
    const browser = getBrowserName();
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // country requires a geo API — use the browser's timezone as a proxy
    // and let each tool resolve IP-based country on their end
    const traits: Record<string, string | undefined> = {
      uid,
      email,
      name: displayName,
      role,
      organizationId: organizationId ?? undefined,
      orgSlug: orgSlug ?? undefined,
      browser,
      device: deviceType,
      screenResolution,
      browserLanguage,
      timezone,
    };

    const w = window as unknown as Record<string, unknown>;

    // Heap
    const heap = w.heap as {
      identify?: (id: string) => void;
      addUserProperties?: (p: Record<string, unknown>) => void;
    } | undefined;
    if (heap?.identify) {
      heap.identify(uid);
      heap.addUserProperties?.(traits);
    }

    // LogRocket
    import('logrocket').then(({ default: LogRocket }) => {
      LogRocket.identify(uid, {
        name: displayName,
        email,
        role,
        browser,
        device: deviceType,
        browserLanguage,
        timezone,
        ...(orgSlug ? { orgSlug } : {}),
        ...(organizationId ? { organizationId } : {}),
      });
    }).catch(() => {});

    // PostHog
    import('posthog-js').then(({ default: posthog }) => {
      posthog.identify(uid, traits);
    }).catch(() => {});

    // Microsoft Clarity
    const clarity = w.clarity as ((cmd: string, ...args: string[]) => void) | undefined;
    if (clarity) {
      clarity('identify', uid, undefined as unknown as string, displayName);
      clarity('set', 'email', email);
      clarity('set', 'role', role);
      clarity('set', 'browser', browser);
      clarity('set', 'device', deviceType);
      clarity('set', 'browserLanguage', browserLanguage);
      if (orgSlug) clarity('set', 'orgSlug', orgSlug);
    }

    // ContentSquare (_uxa custom variables, slots 1-7)
    const uxa = w._uxa as unknown[] | undefined;
    if (Array.isArray(uxa)) {
      const csqVars: [string, string][] = [
        ['userId',          uid],
        ['email',           email],
        ['name',            displayName],
        ['role',            role],
        ['browser',         browser],
        ['device',          deviceType],
        ['browserLanguage', browserLanguage],
      ];
      csqVars.forEach(([key, val], i) => {
        uxa.push(['setCustomVariable', i + 1, key, val, 3]);
      });
    }
    } catch (err) {
      console.warn('[analytics] identify failed (non-fatal):', err);
    }
  }, [user]);

  return null;
}
