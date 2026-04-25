'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { auth } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, LogOut, Search, Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { CommandPalette, useCommandPalette } from '@/components/shared/CommandPalette';
import { AuditLogDrawer } from '@/components/shared/AuditLogDrawer';
import { useUiStore } from '@/store/ui.store';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';

const roleConfig = {
  super_admin: { variant: 'blue' as const, label: 'Super Admin' },
  admin: { variant: 'blue' as const, label: 'Admin' },
  staff: { variant: 'default' as const, label: 'Staff' },
};

export function AppHeader({ orgName }: { orgName?: string }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const [auditOpen, setAuditOpen] = useState(false);
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
  const rc = roleConfig[role] ?? roleConfig.staff;
  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 z-40">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={sidebarCollapsed}
          className="p-1.5 -ml-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition-all duration-150 ease-out"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <MakhzoonMark size={28} />
            <span className="text-sm font-semibold text-gray-900 hidden sm:block">Makhzoon</span>
          </div>
          {orgName && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-600 truncate max-w-[160px]">{orgName}</span>
            </>
          )}
        </div>

        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 w-full max-w-md rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="inline-flex h-5 items-center rounded border border-gray-200 bg-white px-1.5 text-[10px] font-mono text-gray-400">{shortcutLabel}</kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {isAdmin && (
            <button
              onClick={() => setAuditOpen(true)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Recent activity"
              title="Recent activity"
            >
              <Activity className="h-4 w-4" />
            </button>
          )}

          <Badge variant={rc.variant}>{rc.label}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 focus:outline-none">
              <span className="hidden sm:block max-w-[140px] truncate">{user?.displayName || user?.email}</span>
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {isAdmin && <AuditLogDrawer open={auditOpen} onOpenChange={setAuditOpen} />}
    </>
  );
}
