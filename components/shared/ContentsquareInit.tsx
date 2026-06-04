'use client';

import { useEffect } from 'react';
import { APP_ENV } from '@/lib/app-env';

const CSQ_TAG_ID = process.env.NEXT_PUBLIC_CONTENTSQUARE_TAG_ID;

export default function ContentsquareInit() {
  useEffect(() => {
    if (!CSQ_TAG_ID || APP_ENV !== 'production') return;

    const id = 'contentsquare-tag';
    if (document.getElementById(id)) return;

    // ContentSquare requires _sqSettings to be set before the script loads
    (window as unknown as Record<string, unknown>)._sqSettings = { site_id: CSQ_TAG_ID };

    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = `https://t.contentsquare.net/uxa/${CSQ_TAG_ID}.js`;
    document.head.appendChild(script);
  }, []);

  return null;
}
