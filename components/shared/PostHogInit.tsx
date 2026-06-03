'use client';

import { useEffect } from 'react';
import { APP_ENV } from '@/lib/app-env';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

export default function PostHogInit() {
  useEffect(() => {
    if (!POSTHOG_KEY || APP_ENV !== 'production') return;

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
