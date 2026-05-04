'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Command } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useAssets } from '@/hooks/assets';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug } from '@/hooks/ui';
import { Asset } from '@/types';
import { cn } from '@/lib/utils/cn';

function DashboardSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="1.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="9.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="1.5" y="9.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="9.5" y="9.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>; }
function PackageSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M13 4.5L8 2 3 4.5v7L8 14l5-2.5v-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /><path d="M8 2v12M3 4.5l5 2.5 5-2.5" stroke="currentColor" strokeWidth="1.3" /></svg>; }
function ShieldCheckSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 1.5L2 4v5.5C2 12.5 4.7 15 8 15.5c3.3-.5 6-3 6-6V4L8 1.5z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M5.5 8l2 2 3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function ClipboardListSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 2v1.5h4V2M5.5 7h5M5.5 9.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function UsersSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="6" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M11.5 4a2.5 2.5 0 0 1 0 4.5M13.5 14c0-1.7-1-3-2.5-3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function CreditCardSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="1.5" y="3.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M1.5 6.5h13M4.5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function FileTextSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M4 1.5h6l3.5 3.5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M10 1.5v4h3.5M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function SearchSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function PlusSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function UploadSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 10V3M5 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }

const NAV_GROUPS = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardSVG },
  { href: '/assets', label: 'Assets', icon: PackageSVG },
  { href: '/warranties', label: 'Warranties', icon: ShieldCheckSVG },
  { href: '/requests', label: 'Requests', icon: ClipboardListSVG },
];

const ADMIN_NAV = [
  { href: '/users', label: 'Users', icon: UsersSVG },
  { href: '/subscription', label: 'Subscription', icon: CreditCardSVG },
  { href: '/reports', label: 'Reports', icon: FileTextSVG },
];

const ACTIONS = [
  { href: '/assets/new', label: 'Create asset', icon: PlusSVG },
  { href: '/assets/import', label: 'Import assets from CSV', icon: UploadSVG },
  { href: '/warranties/new', label: 'Add warranty', icon: PlusSVG },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const { data: assetsData } = useAssets({ pageSize: 1000 });
  const assets = assetsData?.items ?? [];

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  function go(path: string) {
    onOpenChange(false);
    router.push(`/${locale}/${orgSlug}${path}`);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-border bg-surface-card shadow-lg overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <Command shouldFilter className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4">
              <SearchSVG />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search pages, assets, actions…"
                className="flex-1 h-12 bg-transparent text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
              />
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-surface-page px-1.5 text-[10px] font-mono text-gray-500">ESC</kbd>
            </div>

            <Command.List className="max-h-80 overflow-y-auto py-2">
              <Command.Empty className="px-4 py-6 text-[14px] text-gray-500 text-center">No results.</Command.Empty>

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
                  {assets.slice(0, 50).map((asset: Asset) => (
                    <Command.Item
                      key={asset.id}
                      value={`${asset.name} ${asset.category} ${asset.serialNumber ?? ''}`}
                      onSelect={() => go(`/assets/${asset.id}`)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 mx-2 rounded-md text-sm cursor-pointer',
                        'data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700'
                      )}
                    >
                      <PackageSVG />
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

function PaletteItem({ onSelect, icon: Icon, label }: { onSelect: () => void; icon: React.FC; label: string }) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className={cn(
        'flex items-center gap-2 px-3 py-2 mx-2 rounded-md text-[14px] text-gray-700 cursor-pointer',
        'data-[selected=true]:bg-primary-100/60 data-[selected=true]:text-primary-700'
      )}
    >
      <Icon />
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
