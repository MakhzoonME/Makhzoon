'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Building2, Layers, SlidersHorizontal, Percent, Receipt, Printer } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useAdminGuard, useT } from '@/hooks/ui';
import { useUiStore } from '@/store/ui.store';
import { hasPermByKey } from '@/lib/permissions';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  key: string;
  labelKey: string;
  href: string;
  icon: React.ElementType;
  permissionKey?: string;
  featureKey?: string;
  separator?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'organization', labelKey: 'nav.orgInfo',  href: '/settings/organization', icon: Building2 },
  { key: 'spaces',       labelKey: 'nav.spaces',   href: '/settings/spaces',       icon: Layers,            permissionKey: 'settings.orgInfo' },
  { key: 'lists',        labelKey: 'nav.lists',    href: '/settings/lists',        icon: SlidersHorizontal, permissionKey: 'settings.orgInfo' },
  // POS settings — only visible when pos feature is enabled
  { key: 'tax-rates',    labelKey: 'nav.taxRates', href: '/settings/tax-rates',    icon: Percent,   permissionKey: 'settings.taxRates', featureKey: 'pos', separator: true },
  { key: 'jo-fotara',    labelKey: 'nav.fawtara',  href: '/settings/jo-fotara',    icon: Receipt,   permissionKey: 'settings.fawtara',  featureKey: 'pos' },
  { key: 'receipt',      labelKey: 'nav.receipt',  href: '/settings/receipt',      icon: Printer,   permissionKey: 'settings.fawtara',  featureKey: 'pos' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useAdminGuard([
    'settings.orgInfo',
    'settings.subscription',
    'settings.users',
    'settings.taxRates',
    'settings.fawtara',
  ]);

  const params    = useParams<{ locale: string; orgSlug: string }>();
  const locale    = params?.locale ?? 'en';
  const orgSlug   = params?.orgSlug as string;
  const pathname  = usePathname();
  const { user }  = useAuthStore();
  const { t }     = useT();
  const { setPageHeader, clearPageHeader } = useUiStore();

  useEffect(() => {
    setPageHeader(t('nav.settings'), []);
    return () => clearPageHeader();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const features    = user?.features ?? {};
  const canSeeAdmin = user?.role === 'admin' || user?.role === 'org_owner' || user?.role === 'super_admin';

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.featureKey && !features[item.featureKey]) return false;
    if (!item.permissionKey) return true;
    if (canSeeAdmin) return true;
    return !!user && hasPermByKey(user, item.permissionKey);
  });

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-8 items-start">
      {/* Left nav */}
      <aside className="w-48 flex-shrink-0 space-y-0.5">
        {visibleItems.map((item) => {
          const href     = `/${locale}/${orgSlug}${item.href}`;
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const Icon     = item.icon;
          return (
            <div key={item.key}>
              {item.separator && (
                <div className="my-2 border-t border-border" />
              )}
            <Link
              key={item.key + '-link'}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13.5px] font-medium transition-colors duration-150',
                'border-s-2',
                isActive
                  ? 'border-primary-600 bg-surface-inset text-primary-700 dark:text-primary-400'
                  : 'border-transparent text-gray-600 hover:bg-surface-hover hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
              )}
            >
              <Icon
                size={16}
                strokeWidth={1.75}
                className={cn('flex-shrink-0', isActive ? 'text-primary-600' : 'text-gray-400')}
              />
              {t(item.labelKey as Parameters<typeof t>[0])}
            </Link>
            </div>
          );
        })}
      </aside>

      {/* Page content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
