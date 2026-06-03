'use client';

import { useEffect } from 'react';
import { APP_ENV } from '@/lib/app-env';

const LOGROCKET_APP_ID = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID;

export default function LogRocketInit() {
  useEffect(() => {
    if (!LOGROCKET_APP_ID || APP_ENV !== 'production') return;

    import('logrocket').then(({ default: LogRocket }) => {
      LogRocket.init(LOGROCKET_APP_ID);
    });
  }, []);

  return null;
}
