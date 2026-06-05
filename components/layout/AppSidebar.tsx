'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { useTransferStore } from '@/store/transfer.store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ORG_NAV_ENTRIES, NavEntry, NavGroupConfig, NavItemConfig, buildNavUrl } from '@/lib/nav';
import { SpaceSwitcher } from '@/components/layout/SpaceSwitcher';
import { useOrgInfo } from '@/hooks/org';
import { useSpace } from '@/hooks/ui';
import { hasModuleAccess, hasPermByKey } from '@/lib/permissions';
import { UserPermissions } from '@/types';
import { useT } from '@/hooks/ui';
import { createClient } from '@/lib/supabase/client';
import type { MessageKey } from '@/locales/messages';
import { analytics } from '@/lib/analytics';

/** Display email/username without the synthetic @makhzoon.local suffix */
function displayIdentity(email?: string | null): string {
  if (!email) return '';
  return email.replace(/@makhzoon\.local$/i, '');
}

/* ── Inline SVG nav icons ─────────────────────────────────────── */
function DashboardSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2" y="2" width="6" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="10" y="2" width="6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="10" y="8" width="6" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="2" y="11" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  );
}
function AssetsSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M15 5.5L9 2.5 3 5.5v7L9 15.5l6-3v-7z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M9 2.5v13M3 5.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function InventorySVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2" y="5" width="14" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M6 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 10h6M9 8v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function WarrantySVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 1.5L2.5 4v6.5C2.5 13.8 5.5 16.5 9 17.5c3.5-1 6.5-3.7 6.5-7V4L9 1.5z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function RequestsSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2" y="2" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M5 6h8M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function ReportsSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="7.5" y="9" width="3" height="7" rx="0.5" fill="currentColor" opacity="0.75" />
      <rect x="13" y="5" width="3" height="11" rx="0.5" fill="currentColor" />
      <path d="M3.5 11L7.5 7l4 3L16 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SupportSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 12.5V14l2-1.5h9a1.5 1.5 0 0 0 1.5-1.5V5A1.5 1.5 0 0 0 14 3.5H4A1.5 1.5 0 0 0 2.5 5v6A1.5 1.5 0 0 0 4 12.5h-1z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M6 7.5h6M6 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function AuditSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 3l2.5 2.5M3 9h2M3 13h2M9 3v2M13 3l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="10.5" r="4.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M7.5 10.5l1.5 1.5 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PosSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2" y="3" width="14" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M5 7v4M13 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7 5l2 2 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SettingsSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="6" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" />
      <circle cx="6" cy="13" r="1.5" fill="currentColor" />
    </svg>
  );
}
function BannaSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2.5 3h13v12H2.5V3z" stroke="currentColor" strokeWidth="1.3" fill="none" rx="1.2" />
      <path d="M5.5 7h7M5.5 10h5M5.5 13h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="14" cy="5" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
function ChevronLeftSVG() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M6.5 2L4 5l2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRightSVG() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M3.5 2L6 5l-2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronDownSVG() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ICONS: Record<string, React.FC> = {
  '/dashboard':    DashboardSVG,
  '/usool':        AssetsSVG,
  '/raseed':       InventorySVG,
  '/warranties':   WarrantySVG,
  '/requests':     RequestsSVG,
  '/reports':      ReportsSVG,
  '/support':      SupportSVG,
  '/audit-logs':   AuditSVG,
  '/haraka':       PosSVG,
  '/banna':        BannaSVG,
  '/settings':     SettingsSVG,
};

const EASE_OUT   = [0.16, 1, 0.3, 1] as const;
const EASE_SLIDE = [0.4, 0, 0.2, 1] as const;
// Icon is 18px. Collapsed sidebar is 68px. Center = (68-18)/2 = 25px inline-start padding.
const ICON_INDENT = 'ps-[25px]';
export const SIDEBAR_WIDTH_EXPANDED  = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

function LogOutSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M5.5 2H3a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 3 13h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10 5l3 2.5L10 10M13 7.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppSidebar() {
  const pathname  = usePathname();
  const params    = useParams<{ locale: string; orgSlug: string }>();
  useRouter();
  const locale    = params?.locale ?? 'en';
  const orgSlug   = (params?.orgSlug as string) ?? '';
  const { user }  = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { data: orgInfo } = useOrgInfo();
  const space = useSpace();
  const { t, dir } = useT();
  const isRtl = dir === 'rtl';

  const [userToggles, setUserToggles] = useState<Record<string, boolean>>({});

  async function handleSignOut() {
    analytics.track('user_signed_out');
    analytics.reset();
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore — always redirect
    }
    useTransferStore.getState().clearTransfer();
    window.location.href = `/${locale}/login`;
  }

  const features    = user?.features ?? {};
  const canSeeAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const visibleEntries = ORG_NAV_ENTRIES.filter((entry): entry is NavEntry => {
    if ('type' in entry && entry.type === 'separator') return true;
    if ('type' in entry && entry.type === 'group') {
      if (entry.featureKey && !features[entry.featureKey]) return false;
      if (!entry.adminOnly || canSeeAdmin) return true;
      // Staff: show group if any sub-item permission is granted
      return user?.role === 'staff' && !!user && entry.items.some(
        (sub) => sub.permissionKey && hasPermByKey(user, sub.permissionKey)
      );
    }
    const item = entry as { adminOnly?: boolean; featureKey?: string };
    if (item.adminOnly && !canSeeAdmin) return false;
    if (item.featureKey && !features[item.featureKey]) return false;
    if (user?.role === 'staff' && item.featureKey) {
      const moduleKey = item.featureKey as keyof UserPermissions;
      if (!hasModuleAccess({ ...user, organizationId: user.organizationId ?? null }, moduleKey)) return false;
    }
    return true;
  });

  // Auto-open groups containing the active route, merged with user toggles
  const autoOpenGroups: Record<string, boolean> = {};
  for (const entry of visibleEntries) {
    if (!('type' in entry) || entry.type !== 'group') continue;
    const hasActive = entry.items.some((sub) => {
      const full = buildNavUrl({ locale, orgSlug, space, entry: sub });
      return pathname === full || pathname.startsWith(full + '/');
    });
    if (hasActive) autoOpenGroups[entry.href] = true;
  }
  // Auto-open always wins over a manual close (user toggled shut) when the current route is inside the group
  const effectiveToggles = { ...userToggles };
  for (const href of Object.keys(autoOpenGroups)) {
    if (autoOpenGroups[href]) effectiveToggles[href] = true;
  }
  const openGroups: Record<string, boolean> = { ...autoOpenGroups, ...effectiveToggles };

  function toggleGroup(href: string) {
    if (sidebarCollapsed) {
      toggleSidebar();
      setUserToggles((prev) => ({ ...prev, [href]: true }));
    } else {
      setUserToggles((prev) => ({ ...prev, [href]: !openGroups[href] }));
    }
  }

  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={200}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
        transition={{ duration: 0.28, ease: EASE_SLIDE }}
        className={cn(
          'hidden md:flex fixed top-14 bottom-0 bg-surface-sidebar border-border flex-col z-30',
          isRtl ? 'right-0 border-l' : 'left-0 border-r',
        )}
        style={{ overflow: 'visible', willChange: 'width' }}
      >
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-20',
            'h-6 w-6 rounded-full bg-surface-sidebar border border-border shadow-sm',
            'flex items-center justify-center text-gray-400',
            'hover:text-gray-700 hover:border-border-strong hover:shadow-md',
            'transition-all duration-200',
            isRtl ? '-left-3' : '-right-3',
          )}
        >
          {isRtl
            ? (sidebarCollapsed ? <ChevronLeftSVG /> : <ChevronRightSVG />)
            : (sidebarCollapsed ? <ChevronRightSVG /> : <ChevronLeftSVG />)
          }
        </button>

        {/* Space switcher */}
        <div className="px-2.5 pt-2.5 pb-1 border-b border-border">
          <SpaceSwitcher collapsed={sidebarCollapsed} />
        </div>

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleEntries.map((entry, idx) => {
            /* ── Separator ──────────────────────────────────────── */
            if ('type' in entry && entry.type === 'separator') {
              return (
                <div key={`sep-${idx}`} className="my-1.5 mx-2 border-t border-border" />
              );
            }

            /* ── Group ──────────────────────────────────────────── */
            if ('type' in entry && entry.type === 'group') {
              const group = entry as NavGroupConfig;
              const Icon = NAV_ICONS[group.href] ?? SettingsSVG;
              const isOpen = openGroups[group.href] ?? false;
              const label  = t(group.labelKey as MessageKey, group.label);
              const visibleSubItems = group.items.filter((sub) => {
                if (sub.featureKey && !features[sub.featureKey]) return false;
                if (canSeeAdmin) return true;
                if (!sub.permissionKey) return true;
                return !!user && hasPermByKey(user, sub.permissionKey);
              });
              const hasActiveChild = visibleSubItems.some((sub) => {
                const full = buildNavUrl({ locale, orgSlug, space, entry: sub });
                return pathname === full || pathname.startsWith(full + '/');
              });

              const groupBtn = (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.href)}
                  aria-label={label}
                  className={cn(
                    'group w-full relative flex items-center rounded-lg text-[14px] transition-colors duration-150 h-9',
                    ICON_INDENT,
                    hasActiveChild
                      ? 'font-semibold text-primary-700'
                      : 'text-gray-600 hover:bg-surface-page hover:text-gray-900',
                  )}
                >
                  {hasActiveChild && (
                    <>
                      <motion.span
                        layoutId="sidebar-active-group-pill"
                        className="absolute inset-0 rounded-lg bg-primary-50"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                      <span
                        className={cn('absolute top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary-600', isRtl ? 'right-0 rounded-r-none rounded-l' : 'left-0')}
                      />
                    </>
                  )}
                  <span className="relative z-10 flex-shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
                    <Icon />
                  </span>
                  <motion.span
                    animate={{ width: sidebarCollapsed ? 0 : 'auto', opacity: sidebarCollapsed ? 0 : 1 }}
                    transition={sidebarCollapsed
                      ? { width: { duration: 0.18, ease: EASE_SLIDE }, opacity: { duration: 0.08 } }
                      : { width: { duration: 0.22, ease: EASE_SLIDE }, opacity: { duration: 0.14, delay: 0.16 } }
                    }
                    className="relative z-10 flex flex-1 items-center justify-between whitespace-nowrap overflow-hidden ms-2.5 pe-3"
                    style={{ minWidth: 0 }}
                  >
                    {label}
                    <span className={cn(
                      'transition-transform duration-200 opacity-60 flex-shrink-0',
                      isOpen && 'rotate-180',
                    )}>
                      <ChevronDownSVG />
                    </span>
                  </motion.span>
                </button>
              );

              const subList = !sidebarCollapsed && isOpen ? (
                <motion.div
                  key={`${group.href}-items`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE_SLIDE }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className={cn('pt-0.5 space-y-0.5', isRtl ? 'pe-6' : 'ps-6')}>
                    {visibleSubItems.map((sub) => {
                      const fullHref  = buildNavUrl({ locale, orgSlug, space, entry: sub });
                      const subActive = (() => {
                        if (pathname === fullHref) return true;
                        if (!pathname.startsWith(fullHref + '/')) return false;
                        if (group.href && sub.href === group.href) {
                          const rest = pathname.slice(fullHref.length + 1);
                          const nextSegment = rest.split('/')[0];
                          if (nextSegment && visibleSubItems.some(s => s.href === `${group.href}/${nextSegment}`)) return false;
                        }
                        return true;
                      })();
                      const subLabel  = t(sub.labelKey as MessageKey, sub.label);
                      return (
                        <Link
                          key={sub.href}
                          href={fullHref}
                          aria-label={subLabel}
                          className={cn(
                            'group relative flex items-center rounded-md text-sm py-1.5 px-2.5 transition-colors duration-150',
                            subActive
                              ? 'font-semibold text-primary-700'
                              : 'text-gray-500 hover:bg-surface-page hover:text-gray-900',
                          )}
                        >
                          {subActive && (
                            <motion.span
                              layoutId="sidebar-active-pill"
                              className="absolute inset-0 rounded-md bg-primary-50"
                              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            />
                          )}
                          <span className="relative z-10 whitespace-nowrap">{subLabel}</span>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null;

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={group.href}>
                    <TooltipTrigger asChild>{groupBtn}</TooltipTrigger>
                    <TooltipContent side={isRtl ? 'left' : 'right'}>{label}</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <div key={group.href}>
                  {groupBtn}
                  <AnimatePresence initial={false}>{subList}</AnimatePresence>
                </div>
              );
            }

            /* ── Regular item ───────────────────────────────────── */
            const navEntry = entry as NavItemConfig;
            const { href, label: itemLabel, labelKey } = navEntry;
            const Icon = NAV_ICONS[href] ?? DashboardSVG;
            const fullHref = buildNavUrl({ locale, orgSlug, space, entry: navEntry });
            const active   = pathname === fullHref || pathname.startsWith(fullHref + '/');
            const translatedLabel = t(labelKey as MessageKey, itemLabel);

            const link = (
              <Link
                href={fullHref}
                aria-label={translatedLabel}
                className={cn(
                  'group relative flex items-center rounded-lg text-[14px] transition-colors duration-150 h-9',
                  ICON_INDENT,
                  active
                    ? 'font-semibold text-primary-700'
                    : 'text-gray-600 hover:bg-surface-page hover:text-gray-900',
                )}
              >
                {active && (
                  <>
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-lg bg-primary-50"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                    <span
                      className={cn('absolute top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary-600', isRtl ? 'right-0 rounded-r-none rounded-l' : 'left-0')}
                    />
                  </>
                )}
                <span className="relative z-10 flex-shrink-0 transition-transform duration-200 ease-out group-hover:scale-110">
                  <Icon />
                </span>
                <motion.span
                  animate={{ width: sidebarCollapsed ? 0 : 'auto', opacity: sidebarCollapsed ? 0 : 1 }}
                  transition={sidebarCollapsed
                    ? { width: { duration: 0.18, ease: EASE_SLIDE }, opacity: { duration: 0.08 } }
                    : { width: { duration: 0.22, ease: EASE_SLIDE }, opacity: { duration: 0.14, delay: 0.16 } }
                  }
                  className="relative z-10 whitespace-nowrap overflow-hidden ms-2.5 flex items-center gap-1.5"
                  style={{ minWidth: 0 }}
                >
                  {translatedLabel}
                </motion.span>
              </Link>
            );

            // Optional sub-items rendered indented beneath the parent (e.g. Purchases under Raseed).
            // Visible only when the sidebar is expanded; in collapsed mode children are reachable
            // by clicking the parent and navigating from there.
            const visibleChildren = (navEntry.children ?? []).filter((sub) => {
              if (canSeeAdmin) return true;
              if (sub.featureKey && !features[sub.featureKey]) return false;
              if (sub.permissionKey && user) return hasPermByKey(user, sub.permissionKey);
              return true;
            });

            const childList = !sidebarCollapsed && visibleChildren.length > 0 ? (
              <div className={cn('pt-0.5 space-y-0.5', isRtl ? 'pe-6' : 'ps-6')}>
                {visibleChildren.map((sub) => {
                  const subHref  = buildNavUrl({ locale, orgSlug, space, entry: sub });
                  const subActive = pathname === subHref || pathname.startsWith(subHref + '/');
                  const subLabel = t(sub.labelKey as MessageKey, sub.label);
                  return (
                    <Link
                      key={sub.href}
                      href={subHref}
                      aria-label={subLabel}
                      className={cn(
                        'group relative flex items-center rounded-md text-sm py-1.5 px-2.5 transition-colors duration-150',
                        subActive
                          ? 'text-primary-700 font-semibold'
                          : 'text-gray-500 hover:bg-surface-page hover:text-gray-900',
                      )}
                    >
                      {subActive && (
                        <motion.span
                          layoutId="sidebar-active-pill-child"
                          className="absolute inset-0 rounded-md bg-primary-50"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 whitespace-nowrap">{subLabel}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null;

            if (!sidebarCollapsed) return <div key={href}>{link}{childList}</div>;

            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side={isRtl ? 'left' : 'right'}>{translatedLabel}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* User footer — avatar · name/role · lang toggle · sign out */}
        {user && (
          <div className="p-3 border-t border-border">
            <div className={cn('flex items-center gap-2 px-1 py-1', sidebarCollapsed && 'justify-center')}>
              {/* Avatar — tooltip when collapsed */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`/${locale}/${orgSlug}/profile`}
                    className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-primary-400 transition-shadow"
                  >
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      user.displayName?.[0]?.toUpperCase() ?? displayIdentity(user.email)?.[0]?.toUpperCase()
                    )}
                  </Link>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side={isRtl ? 'left' : 'right'}>
                    {t('profile.accountInfo')}
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Name + role — clickable link to profile, hidden when collapsed */}
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.div
                    key="user-meta"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.14, delay: 0.16, ease: EASE_OUT } }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    className="flex-1 min-w-0"
                  >
                    <Link href={`/${locale}/${orgSlug}/profile`} className="block group">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 transition-colors duration-150">
                        {user.displayName || displayIdentity(user.email)}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate leading-tight">
                        {
                          user.role === 'org_owner'        ? t('role.orgOwner') :
                          user.role === 'admin'            ? t('role.admin') :
                          user.role === 'staff'            ? t('role.staff') :
                          user.role === 'super_admin'      ? t('role.superAdmin') :
                          user.role === 'makhzoon_admin'   ? t('role.makhzoonAdmin') :
                          user.role === 'makhzoon_support' ? t('role.makhzoonSupport') :
                          (user.role as string | undefined)?.replace(/_/g, ' ')
                        }
                        {orgInfo?.name && (
                          <span className="text-gray-400"> · {orgInfo.name}</span>
                        )}
                      </p>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign out — hidden when collapsed */}
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.div
                    key="user-actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.14, delay: 0.18, ease: EASE_OUT } }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    className="flex items-center flex-shrink-0"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleSignOut}
                          aria-label={t('common.signOut')}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150"
                        >
                          <LogOutSVG />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side={isRtl ? 'left' : 'right'}>
                        {t('common.signOut')}
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.aside>
    </TooltipProvider>
  );
}
