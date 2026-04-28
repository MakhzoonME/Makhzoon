'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { auth } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { CommandPalette, useCommandPalette } from '@/components/shared/CommandPalette';
import { useUiStore } from '@/store/ui.store';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { useOrgSlug } from '@/hooks/useOrgSlug';

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

const roleConfig = {
  super_admin: { variant: 'blue' as const, label: 'Super Admin' },
  org_owner:   { variant: 'blue' as const, label: 'Org Owner' },
  admin:       { variant: 'blue' as const, label: 'Admin' },
  staff:       { variant: 'default' as const, label: 'Staff' },
};

export function AppHeader({ orgName }: { orgName?: string }) {
  const { user } = useAuthStore();
  const orgSlug = useOrgSlug();
  const router = useRouter();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const { setMobileMenuOpen } = useUiStore();
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl+K');

  useEffect(() => {
    if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) {
      setShortcutLabel('⌘K');
    }
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(auth);
    router.push('/login');
  }

  const role = user?.role ?? 'staff';
  const rc   = roleConfig[role] ?? roleConfig.staff;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 z-40">
        {/* Burger menu — mobile only */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          className="md:hidden p-1.5 -ml-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition-all duration-150"
        >
          <BurgerSVG />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <MakhzoonMark size={26} />
            <span className="text-sm font-semibold text-gray-900 hidden sm:block">Makhzoon</span>
          </div>
          {orgName && (
            <>
              <span className="text-gray-300 select-none">/</span>
              <span className="text-sm text-gray-600 truncate max-w-[160px]">{orgName}</span>
            </>
          )}
        </div>

        {/* Search bar (desktop) */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 w-full max-w-md rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors duration-150"
          >
            <SearchSVG />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="inline-flex h-5 items-center rounded border border-gray-200 bg-white px-1.5 text-[10px] font-mono text-gray-400">{shortcutLabel}</kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Mobile search */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Search"
          >
            <SearchSVG />
          </button>

          <Badge variant={rc.variant}>{rc.label}</Badge>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 focus:outline-none px-1 py-1 rounded-md hover:bg-gray-50 transition-colors ml-1">
              <span className="hidden sm:block max-w-[140px] truncate">{user?.displayName || user?.email}</span>
              <ChevronDownSVG />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/${orgSlug}/profile`)} className="gap-2">
                <UserSVG />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 gap-2">
                <LogOutSVG />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
