'use client';

import { useEffect } from 'react';

const LOGROCKET_APP_ID = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID;

export default function LogRocketInit() {
  useEffect(() => {
    if (!LOGROCKET_APP_ID) return;

    const host = window.location.hostname;
    const isAllowed =
      host === 'makhzoon.me' || host.endsWith('.makhzoon.me');

    if (!isAllowed) return;

    import('logrocket').then(({ default: LogRocket }) => {
      LogRocket.init(LOGROCKET_APP_ID);
    });
  }, []);

  return null;
}
