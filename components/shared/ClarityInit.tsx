'use client';

import { useEffect } from 'react';

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export default function ClarityInit() {
  useEffect(() => {
    if (!CLARITY_PROJECT_ID) return;

    const host = window.location.hostname;
    const isAllowed =
      host === 'makhzoon.me' || host.endsWith('.makhzoon.me');

    if (!isAllowed) return;

    import('@microsoft/clarity').then(({ default: Clarity }) => {
      Clarity.init(CLARITY_PROJECT_ID);
    });
  }, []);

  return null;
}
