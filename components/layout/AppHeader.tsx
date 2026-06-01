'use client';
import { useState, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { CommandPalette, useCommandPalette } from '@/components/shared/CommandPalette';
import { useUiStore } from '@/store/ui.store';
import { useTransferStore } from '@/store/transfer.store';
import { useT } from '@/hooks/ui';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { NetworkStatusIndicator } from '@/components/shared/NetworkStatusIndicator';
import { cn } from '@/lib/utils/cn';

/* ── Inline SVG icons ───────────────────────────────────────────── */
function BurgerSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1" y="3" width="14" height="1.3" rx="0.65" fill="currentColor" />
      <rect x="1" y="7.35" width="14" height="1.3" rx="0.65" fill="currentColor" />
      <rect x="1" y="11.7" width="14" height="1.3" rx="0.65" fill="currentColor" />
    </svg>
  );
}
function SearchSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function ChevronRightSVG() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BellSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 2a5 5 0 0 1 5 5v2.5l1.5 2H2.5L4 9.5V7a5 5 0 0 1 5-5z"
        stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      <path d="M7 14.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function AppHeader() {
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const { setMobileMenuOpen } = useUiStore();
  const { headerTitle, headerBreadcrumb } = useUiStore();
  const { t, locale } = useT();

  const shortcutLabel = useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K'),
    () => 'Ctrl+K',
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-surface-card border-b border-border flex items-center px-4 gap-3 z-40">

        {/* Burger — mobile only */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t('common.menu')}
          className="md:hidden p-1.5 -ms-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition-all duration-150 dark:hover:bg-gray-700/40 flex-shrink-0"
        >
          <BurgerSVG />
        </button>

        {/* Page title + breadcrumb */}
        <div className="hidden md:flex flex-col justify-center min-w-0 flex-shrink-0 max-w-sm">
          {headerBreadcrumb.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 leading-none mb-0.5 flex-wrap">
              {headerBreadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && (
                    <span className="text-gray-300 dark:text-gray-600">
                      <ChevronRightSVG />
                    </span>
                  )}
                  <span className={cn(
                    'whitespace-nowrap',
                    i === headerBreadcrumb.length - 1 ? 'text-gray-500 dark:text-gray-400 font-medium' : '',
                  )}>
                    {crumb.label}
                  </span>
                </span>
              ))}
            </div>
          )}
          {headerTitle && (
            <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {headerTitle}
            </p>
          )}
        </div>

        {/* Search bar — desktop */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 w-full max-w-md rounded-lg border border-border bg-surface-input px-3 py-1.5 text-sm text-gray-500 hover:bg-surface-sidebar hover:border-border-strong transition-colors duration-150"
          >
            <SearchSVG />
            <span className="flex-1 text-start">{t('common.search')}</span>
            <kbd className="inline-flex h-5 items-center rounded border border-border bg-surface-card px-1.5 text-[10px] font-mono text-gray-500">{shortcutLabel}</kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ms-auto">
          {/* Mobile search */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors dark:hover:bg-gray-700/40"
            aria-label={t('common.search')}
          >
            <SearchSVG />
          </button>

          <NetworkStatusIndicator variant="ghost-light" />
          <ThemeToggle />
          <LanguageToggle />

          {/* Notification bell */}
          <button
            type="button"
            aria-label={t('common.notifications')}
            className="relative p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-150 dark:hover:bg-gray-700/40"
          >
            <BellSVG />
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-surface-card"
            />
          </button>

          {/* Per-page action buttons — portaled in from PageHeader */}
          <div id="header-actions-slot" className="flex items-center gap-2 ms-1" />
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
