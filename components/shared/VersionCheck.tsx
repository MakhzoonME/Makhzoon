'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { BUILD_ID } from '@/lib/app-env';
import { useT } from '@/hooks/ui';

const POLL_INTERVAL_MS = 5 * 60_000;

/**
 * Detects when a newer deployment has gone live while this tab is still
 * running an older build, and prompts a refresh. Compares the build ID this
 * page loaded with (inlined at build time) against whatever /api/version
 * reports right now (never cached, so it always reflects the live worker).
 * No-op locally — BUILD_ID defaults to 'dev' on both sides there.
 */
export function VersionCheck() {
  const { t } = useT();
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/version', { cache: 'no-store' });
      if (!res.ok) return;
      const { buildId } = (await res.json()) as { buildId: string };
      if (buildId && buildId !== BUILD_ID) setUpdateAvailable(true);
    } catch {
      // Network hiccup — try again on the next poll/focus, never surface an error for this.
    }
  }, []);

  useEffect(() => {
    if (updateAvailable) return;
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    function onVisible() {
      if (document.visibilityState === 'visible') check();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [check, updateAvailable]);

  if (!updateAvailable) return null;

  return (
    <div
      className="fixed top-3 right-3 z-50 flex items-center gap-3 rounded-full border border-border bg-surface-card shadow-lg px-4 py-2 text-sm"
      role="status"
    >
      <span className="text-gray-700">{t('update.available')}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 rounded-full bg-primary text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90 transition-opacity cursor-pointer"
      >
        <RefreshCw size={12} /> {t('update.refresh')}
      </button>
    </div>
  );
}
