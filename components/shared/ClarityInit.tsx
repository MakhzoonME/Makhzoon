'use client';

import { useEffect } from 'react';
import { APP_ENV } from '@/lib/app-env';

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export default function ClarityInit() {
  useEffect(() => {
    if (!CLARITY_PROJECT_ID || APP_ENV !== 'production') return;

    import('@microsoft/clarity').then(({ default: Clarity }) => {
      Clarity.init(CLARITY_PROJECT_ID);
    });
  }, []);

  return null;
}
