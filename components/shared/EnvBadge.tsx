'use client';
import { APP_ENV } from '@/lib/firebase/client';

/**
 * Small fixed badge that surfaces the current Firebase environment in
 * non-production builds, so super admins never confuse staging/dev with prod.
 * Renders nothing in production.
 */
export function EnvBadge() {
  if (APP_ENV === 'production') return null;
  const color = APP_ENV === 'staging' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div
      className={`fixed bottom-3 right-3 z-50 ${color} text-white text-[11px] font-mono font-semibold px-2 py-1 rounded shadow-lg pointer-events-none select-none`}
      aria-hidden
    >
      {APP_ENV.toUpperCase()}
    </div>
  );
}
