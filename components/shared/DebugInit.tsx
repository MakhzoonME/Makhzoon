'use client';

import { useEffect } from 'react';

function isDebugEnv(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname !== 'app.makhzoon.me';
}

export default function DebugInit() {
  useEffect(() => {
    if (!isDebugEnv()) return;

    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url;
      const method = (
        init?.method ??
        (typeof input !== 'string' && 'method' in input ? (input as Request).method : undefined) ??
        'GET'
      ).toUpperCase();

      console.groupCollapsed(`[fetch] ${method} ${url}`);
      console.log('→ request', { method, headers: init?.headers, body: init?.body ?? undefined });

      const t0 = performance.now();
      try {
        const res = await originalFetch(input, init);
        const ms = Math.round(performance.now() - t0);
        const clone = res.clone();
        let body: unknown;
        try {
          const ct = clone.headers.get('content-type') ?? '';
          body = ct.includes('application/json') ? await clone.json() : await clone.text();
        } catch {
          body = '(unreadable)';
        }
        const log = res.ok ? console.log : console.warn;
        log(`← ${res.status} (${ms}ms)`, body);
        console.groupEnd();
        return res;
      } catch (err) {
        console.error('← error', err);
        console.groupEnd();
        throw err;
      }
    };

    return () => {
      globalThis.fetch = originalFetch;
    };
  }, []);

  return null;
}
