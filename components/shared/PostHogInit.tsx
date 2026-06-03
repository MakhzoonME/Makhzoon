'use client';

import { useEffect } from 'react';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

export default function PostHogInit() {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    const host = window.location.hostname;
    const isAllowed =
      host === 'makhzoon.me' || host.endsWith('.makhzoon.me');

    if (!isAllowed) return;

    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        defaults: '2025-05-24',
        person_profiles: 'identified_only',
      });
    });
  }, []);

  return null;
}
