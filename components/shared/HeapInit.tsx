'use client';

import { useEffect } from 'react';

const HEAP_APP_ID = process.env.NEXT_PUBLIC_HEAP_APP_ID;

export default function HeapInit() {
  useEffect(() => {
    if (!HEAP_APP_ID) return;

    const host = window.location.hostname;
    const isAllowed =
      host === 'makhzoon.me' || host.endsWith('.makhzoon.me');

    if (!isAllowed) return;

    const w = window as unknown as {
      heap?: { load?: (id: string) => void };
      heapReadyCb?: unknown[];
    };
    if (w.heap?.load) return;

    // Official Heap loader snippet (defines the window.heap stub, then loads
    // the remote config script which boots the full SDK).
    w.heapReadyCb = w.heapReadyCb || [];
    const heap = (w.heap = (w.heap as never) || []) as unknown as {
      load: (e: string, t?: Record<string, unknown>) => void;
      [k: string]: unknown;
    };
    heap.load = function (e: string, t?: Record<string, unknown>) {
      (w.heap as Record<string, unknown>).envId = e;
      const cfg = (t || {}) as Record<string, unknown>;
      cfg.shouldFetchServerConfig = false;
      (w.heap as Record<string, unknown>).clientConfig = cfg;

      const a = document.createElement('script');
      a.type = 'text/javascript';
      a.async = true;
      a.src = `https://cdn.us.heap-api.com/config/${e}/heap_config.js`;
      const r = document.getElementsByTagName('script')[0];
      r.parentNode?.insertBefore(a, r);

      const methods = [
        'init', 'startTracking', 'stopTracking', 'track', 'resetIdentity',
        'identify', 'getSessionId', 'getUserId', 'getIdentity',
        'addUserProperties', 'addEventProperties', 'removeEventProperty',
        'clearEventProperties', 'addAccountProperties', 'addAdapter',
        'addTransformer', 'addTransformerFn', 'onReady',
        'addPageviewProperties', 'removePageviewProperty',
        'clearPageviewProperties', 'trackPageview',
      ];
      const stub = (name: string) =>
        function (...args: unknown[]) {
          w.heapReadyCb!.push({
            name,
            fn: function () {
              const fn = (heap as Record<string, unknown>)[name];
              if (typeof fn === 'function') (fn as (...a: unknown[]) => void).apply(heap, args);
            },
          });
        };
      for (const m of methods) (heap as Record<string, unknown>)[m] = stub(m);
    };

    heap.load(HEAP_APP_ID);
  }, []);

  return null;
}
