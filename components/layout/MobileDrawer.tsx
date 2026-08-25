'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { hasModuleAccess, hasPermByKey } from '@/lib/permissions';
import type { UserPermissions } from '@/types/user-permissions.types';
import type { AddOnKey, HarakaModule } from '@/types/subscription.types';
import { useUiStore } from '@/store/ui.store';
import { useTransferStore } from '@/store/transfer.store';
import { useSubscriptionFeatures, useActiveHarakaModules, useActiveAddOns } from '@/hooks/org';
import { createClient } from '@/lib/supabase/client';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { SpaceSwitcher } from '@/components/layout/SpaceSwitcher';
import { useT, useSpace } from '@/hooks/ui';
import {
  ORG_NAV_ENTRIES, buildNavUrl,
  type NavEntry, type NavGroupConfig, type NavItemConfig, type NavSectionHeader,
} from '@/lib/nav';
import type { MessageKey } from '@/locales/messages';

function DashboardSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="2" width="6" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="10" y="2" width="6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="10" y="8" width="6" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="2" y="11" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>; }
function AssetsSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M15 5.5L9 2.5 3 5.5v7L9 15.5l6-3v-7z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M9 2.5v13M3 5.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function InventorySVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="5" width="14" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M6 10h6M9 8v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function WarrantySVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M9 1.5L2.5 4v6.5C2.5 13.8 5.5 16.5 9 17.5c3.5-1 6.5-3.7 6.5-7V4L9 1.5z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function ReportsSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.6" /><rect x="7.5" y="9" width="3" height="7" rx="0.5" fill="currentColor" opacity="0.75" /><rect x="13" y="5" width="3" height="11" rx="0.5" fill="currentColor" /><path d="M3.5 11L7.5 7l4 3L16 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function UsersSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M2 15c0-2.761 2.239-4.5 5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" /><path d="M16 15c0-2.209-1.343-3.5-3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function SubscriptionSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="4.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M2 8h14" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 11.5h2M10 11.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function SupportSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M3 12.5V14l2-1.5h9a1.5 1.5 0 0 0 1.5-1.5V5A1.5 1.5 0 0 0 14 3.5H4A1.5 1.5 0 0 0 2.5 5v6A1.5 1.5 0 0 0 4 12.5h-1z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 7.5h6M6 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function AuditSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M3 3l2.5 2.5M3 9h2M3 13h2M9 3v2M13 3l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="9" cy="10.5" r="4.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M7.5 10.5l1.5 1.5 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function PosSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="3" width="14" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M5 7v4M13 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M7 5l2 2 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function BannaSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M2.5 3h13v12H2.5V3z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M5.5 7h7M5.5 10h5M5.5 13h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="14" cy="5" r="1.5" fill="currentColor" opacity="0.6" /></svg>; }
function LoyaltySVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M9 2.5l1.9 3.85 4.25.62-3.08 3 .73 4.23L9 12.15l-3.8 2.05.73-4.23-3.08-3 4.25-.62L9 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>; }
function SettingsSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="6" cy="5" r="1.5" fill="currentColor" /><circle cx="12" cy="9" r="1.5" fill="currentColor" /><circle cx="6" cy="13" r="1.5" fill="currentColor" /></svg>; }
function ChevronDownSVG() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function XSvg() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function LogOutSVG() { return <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M9 4.5L12 7l-3 2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

const NAV_ICONS: Record<string, React.FC> = {
  '/dashboard':    DashboardSVG,
  '/usool':        AssetsSVG,
  '/raseed':       InventorySVG,
  '/warranties':   WarrantySVG,
  '/reports':      ReportsSVG,
  '/users':        UsersSVG,
  '/subscription': SubscriptionSVG,
  '/support':      SupportSVG,
  '/audit-logs':   AuditSVG,
  '/haraka':       PosSVG,
  '/banna':        BannaSVG,
  '/loyalty':      LoyaltySVG,
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function MobileDrawer() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const orgSlug = (params?.orgSlug as string) ?? '';
  const space = useSpace();
  const { user } = useAuthStore();
  const { mobileMenuOpen, setMobileMenuOpen } = useUiStore();
  const features = useSubscriptionFeatures();
  const activeHarakaModules = useActiveHarakaModules();
  const activeAddOns = useActiveAddOns();
  const { t, dir } = useT();
  const offscreen = dir === 'rtl' ? '100%' : '-100%';

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const canSeeAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';
  const adminHasCustomPerms = canSeeAdmin && !!user?.permissions;

  // Same visibility rules as the desktop sidebar (AppSidebar) — a group is
  // reachable if the org's subscription includes it and the user (staff, or
  // an admin with custom restrictions) holds access to any operation inside
  // it, not just its 'view' key.
  const visibleEntries = ORG_NAV_ENTRIES.filter((entry): entry is NavEntry => {
    if ('type' in entry && entry.type === 'separator') return false;
    if ('type' in entry && entry.type === 'group') {
      if (entry.featureKey && !features[entry.featureKey]) return false;
      if (entry.adminOnly && !canSeeAdmin) {
        return user?.role === 'staff' && !!user && entry.items.some(
          (sub) => !('type' in sub) && sub.permissionKey && hasPermByKey(user, sub.permissionKey),
        );
      }
      if (user && (user.role === 'staff' || adminHasCustomPerms)) {
        const u = { ...user, organizationId: user.organizationId ?? null };
        if (entry.permissionKey) {
          const [permModule] = entry.permissionKey.split('.');
          return hasModuleAccess(u, permModule as keyof UserPermissions);
        }
        if (entry.featureKey) return hasModuleAccess(u, entry.featureKey as keyof UserPermissions);
      }
      return true;
    }
    const item = entry as { adminOnly?: boolean; featureKey?: string; harakaModule?: HarakaModule; harakaAddOn?: AddOnKey; permissionKey?: string };
    if (item.adminOnly && !canSeeAdmin) return false;
    if (item.featureKey && !features[item.featureKey]) return false;
    if (item.harakaModule && !activeHarakaModules.includes(item.harakaModule)) return false;
    if (item.harakaAddOn && !activeAddOns[item.harakaAddOn]) return false;
    if (user && (user.role === 'staff' || adminHasCustomPerms)) {
      const u = { ...user, organizationId: user.organizationId ?? null };
      if (item.permissionKey) {
        if (!hasPermByKey(u, item.permissionKey)) return false;
      } else if (item.featureKey) {
        if (!hasModuleAccess(u, item.featureKey as keyof UserPermissions)) return false;
      }
    }
    return true;
  });

  async function handleLogout() {
    setIsLoggingOut(true);
    setMobileMenuOpen(false);
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      const supabase = await createClient(); await supabase.auth.signOut();
    } catch {
      // ignore — always redirect regardless of errors
    }
    useTransferStore.getState().clearTransfer();
    window.location.href = `/${locale}/login`;
  }

  function toggleGroup(href: string) {
    setOpenGroups((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer panel */}
          <motion.aside
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="fixed start-0 top-0 bottom-0 z-50 w-72 bg-white flex flex-col shadow-xl md:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MakhzoonMark size={24} />
                <span className="text-sm font-semibold text-gray-900">{t('brand.name')}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label={t('common.close')}
              >
                <XSvg />
              </button>
            </div>

            {/* User info */}
            {user && (
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 flex-shrink-0 overflow-hidden">
                    {user.avatarUrl && !avatarError ? (
                      <img src={user.avatarUrl} alt="" className="object-cover w-full h-full" onError={() => setAvatarError(true)} />
                    ) : (
                      user.displayName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || user.email}</p>
                    <p className="text-xs text-gray-500">{
                      user.role === 'super_admin' ? t('role.superAdmin') :
                      user.role === 'makhzoon_admin' ? t('role.makhzoonAdmin') :
                      user.role === 'makhzoon_support' ? t('role.makhzoonSupport') :
                      user.role === 'org_owner' ? t('role.orgOwner') :
                      user.role === 'admin' ? t('role.admin') :
                      user.role === 'staff' ? t('role.staff') :
                      (user.role as string | undefined)?.replace('_', ' ')
                    }</p>
                  </div>
                </div>
              </div>
            )}

            {/* Space switcher */}
            <div className="px-2.5 py-2 border-b border-gray-100">
              <SpaceSwitcher />
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
              {visibleEntries.map((entry) => {
                /* ── Group (renders its own subtabs, expand/collapse) ──── */
                if ('type' in entry && entry.type === 'group') {
                  const group = entry as NavGroupConfig;
                  const Icon = NAV_ICONS[group.href] ?? SettingsSVG;
                  const label = t(group.labelKey as MessageKey, group.label);
                  const groupFullHref = buildNavUrl({ locale, orgSlug, space, entry: group });
                  const isOnGroupRoot = pathname === groupFullHref;

                  const visibleSubItems = (group.items as (NavItemConfig | NavSectionHeader)[])
                    .filter((sub): sub is NavItemConfig => !('type' in sub))
                    .filter((sub) => {
                      if (sub.featureKey && !features[sub.featureKey]) return false;
                      if (sub.harakaModule && !activeHarakaModules.includes(sub.harakaModule)) return false;
                      if (sub.harakaAddOn && !activeAddOns[sub.harakaAddOn]) return false;
                      if (canSeeAdmin || !sub.permissionKey) return true;
                      return !!user && hasPermByKey(user, sub.permissionKey);
                    });

                  const hasActiveChild = isOnGroupRoot || visibleSubItems.some((sub) => {
                    const full = buildNavUrl({ locale, orgSlug, space, entry: sub });
                    return pathname === full || pathname.startsWith(full + '/');
                  });
                  const isOpen = openGroups[group.href] ?? hasActiveChild;

                  return (
                    <div key={group.href}>
                      <div
                        className={cn(
                          'flex items-center rounded-lg text-sm transition-colors duration-150',
                          hasActiveChild
                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        )}
                      >
                        <Link
                          href={groupFullHref}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex flex-1 items-center gap-3 px-3 py-2.5 min-w-0"
                        >
                          <Icon />
                          <span className="truncate">{label}</span>
                        </Link>
                        {visibleSubItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.href)}
                            aria-label={label}
                            aria-expanded={isOpen}
                            className="px-3 py-2.5 text-gray-400 hover:text-gray-700"
                          >
                            <span className={cn('inline-block transition-transform duration-150', isOpen && 'rotate-180')}>
                              <ChevronDownSVG />
                            </span>
                          </button>
                        )}
                      </div>
                      {isOpen && visibleSubItems.length > 0 && (
                        <div className="ms-[27px] ps-3 border-s border-gray-100 space-y-0.5 py-0.5">
                          {visibleSubItems.map((sub) => {
                            const fullHref = buildNavUrl({ locale, orgSlug, space, entry: sub });
                            const active = pathname === fullHref || pathname.startsWith(fullHref + '/');
                            return (
                              <Link
                                key={sub.href}
                                href={fullHref}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                  'block px-3 py-2 rounded-lg text-sm transition-colors duration-150 truncate',
                                  active
                                    ? 'text-indigo-700 font-semibold'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                )}
                              >
                                {t(sub.labelKey as MessageKey, sub.label)}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                /* ── Plain item ─────────────────────────────────────── */
                const item = entry as NavItemConfig;
                const Icon = NAV_ICONS[item.href] ?? SettingsSVG;
                const fullHref = buildNavUrl({ locale, orgSlug, space, entry: item });
                const active = pathname === fullHref || pathname.startsWith(fullHref + '/');
                return (
                  <Link
                    key={item.href}
                    href={fullHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150',
                      active
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <Icon />
                    <span>{t(item.labelKey as MessageKey, item.label)}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOutSVG />
                <span>{isLoggingOut ? '…' : t('common.signOut')}</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
