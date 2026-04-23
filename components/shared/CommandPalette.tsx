'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { LayoutDashboard, Package, ShieldCheck, ClipboardList, Users, CreditCard, FileText, Search, Plus, Upload } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useAuthStore } from '@/store/auth.store';
import { Asset } from '@/types';
import { cn } from '@/lib/utils/cn';

const NAV_GROUPS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Assets', icon: Package },
  { href: '/warranties', label: 'Warranties', icon: ShieldCheck },
  { href: '/requests', label: 'Requests', icon: ClipboardList },
];

const ADMIN_NAV = [
  { href: '/users', label: 'Users', icon: Users },
  { href: '/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/reports', label: 'Reports', icon: FileText },
];

const ACTIONS = [
  { href: '/assets/new', label: 'Create asset', icon: Plus },
  { href: '/assets/import', label: 'Import assets from CSV', icon: Upload },
  { href: '/warranties/new', label: 'Add warranty', icon: Plus },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const { data: assets = [] } = useAssets();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <Command shouldFilter className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4">
              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search pages, assets, actions…"
                className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-mono text-gray-400">ESC</kbd>
            </div>

            <Command.List className="max-h-80 overflow-y-auto py-2">
              <Command.Empty className="px-4 py-6 text-sm text-gray-400 text-center">No results.</Command.Empty>

              <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-gray-400">
                {NAV_GROUPS.map((item) => (
                  <PaletteItem key={item.href} onSelect={() => go(item.href)} icon={item.icon} label={item.label} />
                ))}
                {isAdmin && ADMIN_NAV.map((item) => (
                  <PaletteItem key={item.href} onSelect={() => go(item.href)} icon={item.icon} label={item.label} />
                ))}
              </Command.Group>

              {isAdmin && (
                <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-gray-400">
                  {ACTIONS.map((item) => (
                    <PaletteItem key={item.href} onSelect={() => go(item.href)} icon={item.icon} label={item.label} />
                  ))}
                </Command.Group>
              )}

              {assets.length > 0 && (
                <Command.Group heading="Assets" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-gray-400">
                  {assets.slice(0, 20).map((asset: Asset) => (
                    <Command.Item
                      key={asset.id}
                      value={`${asset.name} ${asset.category} ${asset.serialNumber ?? ''}`}
                      onSelect={() => go(`/assets/${asset.id}`)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 mx-2 rounded-md text-sm cursor-pointer',
                        'data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700'
                      )}
                    >
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="flex-1 truncate">{asset.name}</span>
                      <span className="text-xs text-gray-400">{asset.category}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PaletteItem({ onSelect, icon: Icon, label }: { onSelect: () => void; icon: React.ElementType; label: string }) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className={cn(
        'flex items-center gap-2 px-3 py-2 mx-2 rounded-md text-sm cursor-pointer',
        'data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700'
      )}
    >
      <Icon className="h-4 w-4 text-gray-400" />
      <span>{label}</span>
    </Command.Item>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { open, setOpen };
}
