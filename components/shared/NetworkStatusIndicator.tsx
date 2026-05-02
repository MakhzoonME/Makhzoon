'use client';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/hooks/ui';
import type { MessageKey } from '@/locales/messages';

type NetworkStatus = 'online' | 'offline' | 'slow';

interface NetworkInformation extends EventTarget {
  readonly effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
}

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') return undefined;
  type Nav = Navigator & {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  };
  const nav = navigator as Nav;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

function resolveStatus(): NetworkStatus {
  if (typeof navigator === 'undefined') return 'online';
  if (!navigator.onLine) return 'offline';
  const conn = getConnection();
  if (conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) return 'slow';
  return 'online';
}

/* ── SVG icons ─────────────────────────────────────────────────────── */

function WifiOnlineSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="12.5" r="1" fill="currentColor" />
      <path d="M5.2 10.3a3.2 3.2 0 0 1 4.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2.8 7.8a6.5 6.5 0 0 1 9.4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M0.5 5.3a9.8 9.8 0 0 1 14 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function WifiSlowSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="12.5" r="1" fill="currentColor" />
      <path d="M5.2 10.3a3.2 3.2 0 0 1 4.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2.8 7.8a6.5 6.5 0 0 1 9.4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
      <path d="M0.5 5.3a9.8 9.8 0 0 1 14 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

function WifiOfflineSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="12.5" r="1" fill="currentColor" />
      <path d="M5.2 10.3a3.2 3.2 0 0 1 4.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2.8 7.8a6.5 6.5 0 0 1 9.4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M0.5 5.3a9.8 9.8 0 0 1 14 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2 2L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ── Config ────────────────────────────────────────────────────────── */

const STATUS_ICON: Record<NetworkStatus, React.FC> = {
  online:  WifiOnlineSVG,
  offline: WifiOfflineSVG,
  slow:    WifiSlowSVG,
};

const STATUS_COLOR: Record<NetworkStatus, { light: string; dark: string }> = {
  online:  { light: 'text-green-500 dark:text-green-400', dark: 'text-green-400' },
  offline: { light: 'text-red-500 dark:text-red-400',     dark: 'text-red-400'   },
  slow:    { light: 'text-amber-500 dark:text-amber-400', dark: 'text-amber-400' },
};

const STATUS_DOT: Record<Exclude<NetworkStatus, 'online'>, string> = {
  offline: 'bg-red-500',
  slow:    'bg-amber-500',
};

const STATUS_KEY: Record<NetworkStatus, MessageKey> = {
  online:  'network.online',
  offline: 'network.offline',
  slow:    'network.slow',
};

/* ── Component ─────────────────────────────────────────────────────── */

interface Props {
  /** 'ghost-dark' for dark backgrounds (superadmin), 'ghost-light' for light backgrounds */
  variant?: 'ghost-light' | 'ghost-dark';
  className?: string;
}

export function NetworkStatusIndicator({ variant = 'ghost-light', className }: Props) {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const { t } = useT();

  useEffect(() => {
    setStatus(resolveStatus());

    const handleOnline  = () => setStatus(resolveStatus());
    const handleOffline = () => setStatus('offline');
    const handleChange  = () => setStatus(resolveStatus());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const conn = getConnection();
    conn?.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      conn?.removeEventListener('change', handleChange);
    };
  }, []);

  const Icon      = STATUS_ICON[status];
  const colorClass = STATUS_COLOR[status][variant === 'ghost-dark' ? 'dark' : 'light'];
  const label     = t(STATUS_KEY[status]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              'relative flex items-center justify-center w-8 h-8 rounded-md transition-colors',
              variant === 'ghost-dark'
                ? 'hover:bg-blue-900/50'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700',
              colorClass,
              className,
            )}
          >
            <Icon />
            {status !== 'online' && (
              <span
                className={cn(
                  'absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse',
                  STATUS_DOT[status],
                )}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
