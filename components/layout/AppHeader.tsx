'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { auth, signOut } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { CommandPalette, useCommandPalette } from '@/components/shared/CommandPalette';
import { useUiStore } from '@/store/ui.store';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { useOrgSlug, useT } from '@/hooks/ui';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { NetworkStatusIndicator } from '@/components/shared/NetworkStatusIndicator';

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
function ChevronDownSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path d="M3 5l3.5 3.5L10 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UserSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M1.5 12.5c0-3 2-4.5 5.5-4.5s5.5 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function LogOutSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 4.5L12 7l-3 2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const roleConfig: Record<string, { variant: 'blue' | 'default'; label: string }> = {
  super_admin:       { variant: 'blue', label: 'Super Admin' },
  makhzoon_admin:    { variant: 'blue', label: 'Makhzoon Admin' },
  makhzoon_support:  { variant: 'blue', label: 'Makhzoon Support' },
  org_owner:         { variant: 'blue', label: 'Owner' },
  admin:             { variant: 'blue', label: 'Admin' },
  staff:             { variant: 'default', label: 'Staff' },
};

export function AppHeader({ orgName }: { orgName?: string }) {
  const { user } = useAuthStore();
  const orgSlug = useOrgSlug();
  const router = useRouter();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const { setMobileMenuOpen } = useUiStore();
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl+K');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t } = useT();

  useEffect(() => {
    if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) {
      setShortcutLabel('⌘K');
    }
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      await signOut(auth);
    } catch {
      // ignore — always redirect regardless of errors
    }
    window.location.href = '/login';
  }

  const role = user?.role ?? 'staff';
  const rc   = roleConfig[role] ?? roleConfig.staff;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 z-40">
        {/* Burger menu — mobile only */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          className="md:hidden p-1.5 -ml-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150"
        >
          <BurgerSVG />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <MakhzoonMark size={26} />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">{t('brand.name')}</span>
          </div>
          {orgName && (
            <>
              <span className="text-gray-300 dark:text-gray-600 select-none">/</span>
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[160px]">{orgName}</span>
            </>
          )}
        </div>

        {/* Search bar (desktop) */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600 transition-colors duration-150"
          >
            <SearchSVG />
            <span className="flex-1 text-left">{t('common.search')}</span>
            <kbd className="inline-flex h-5 items-center rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-1.5 text-[10px] font-mono text-gray-400 dark:text-gray-500">{shortcutLabel}</kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Mobile search */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('common.search')}
          >
            <SearchSVG />
          </button>

          <NetworkStatusIndicator />
          <ThemeToggle />
          <LanguageToggle />

          <Badge variant={rc.variant}>{rc.label}</Badge>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none px-1 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ml-1">
              <span className="hidden sm:block max-w-[140px] truncate">{user?.displayName || user?.email}</span>
              <ChevronDownSVG />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 dark:bg-gray-800 dark:border-gray-700">
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="dark:bg-gray-700" />
              <DropdownMenuItem onClick={() => router.push(`/${orgSlug}/profile`)} className="gap-2 dark:text-gray-200 dark:focus:bg-gray-700">
                <UserSVG />
                {t('common.profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-gray-700" />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 dark:focus:bg-gray-700 gap-2">
                <LogOutSVG />
                {isLoggingOut ? '…' : t('common.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
