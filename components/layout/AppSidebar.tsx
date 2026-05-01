'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ORG_NAV_ITEMS } from '@/lib/nav';
import { hasModuleAccess } from '@/lib/permissions';
import { UserPermissions } from '@/types';
import { useT } from '@/hooks/useT';
import type { MessageKey } from '@/locales/messages';

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
function UsersSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 15c0-2.761 2.239-4.5 5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M16 15c0-2.209-1.343-3.5-3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function SubscriptionSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2" y="4.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M2 8h14" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 11.5h2M10 11.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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

const NAV_ICONS: Record<string, React.FC> = {
  '/dashboard':    DashboardSVG,
  '/assets':       AssetsSVG,
  '/inventory':    InventorySVG,
  '/warranties':   WarrantySVG,
  '/requests':     RequestsSVG,
  '/reports':      ReportsSVG,
  '/users':        UsersSVG,
  '/subscription': SubscriptionSVG,
  '/support':      SupportSVG,
  '/audit-logs':   AuditSVG,
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const SIDEBAR_WIDTH_EXPANDED  = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 64;

export function AppSidebar() {
  const pathname  = usePathname();
  const params    = useParams();
  const orgSlug   = (params?.orgSlug as string) ?? '';
  const { user }  = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { t, dir } = useT();
  const isRtl = dir === 'rtl';

  const features  = user?.features ?? {};
  const canSeeAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const visibleItems = ORG_NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !canSeeAdmin) return false;
    if (item.featureKey && features[item.featureKey] === false) return false;
    if (user?.role === 'staff' && item.featureKey) {
      const moduleKey = item.featureKey as keyof UserPermissions;
      if (!hasModuleAccess({ ...user, organizationId: user.organizationId ?? null }, moduleKey)) return false;
    }
    return true;
  });

  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={200}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className={cn(
          'hidden md:flex fixed top-14 bottom-0 bg-surface-sidebar border-gray-200 dark:border-gray-800 flex-col z-30',
          isRtl ? 'right-0 border-l' : 'left-0 border-r',
        )}
        style={{ overflow: 'visible', contain: 'layout style' }}
      >
        {/* Collapse toggle — outer edge, vertically centered */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-20',
            'h-6 w-6 rounded-full bg-surface-sidebar border border-gray-200 dark:border-gray-700 shadow-sm',
            'flex items-center justify-center text-gray-400 dark:text-gray-500',
            'hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 hover:shadow-md',
            'transition-all duration-200',
            isRtl ? '-left-3' : '-right-3',
          )}
        >
          {isRtl
            ? (sidebarCollapsed ? <ChevronLeftSVG /> : <ChevronRightSVG />)
            : (sidebarCollapsed ? <ChevronRightSVG /> : <ChevronLeftSVG />)
          }
        </button>

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleItems.map(({ href, label, labelKey }) => {
            const Icon = NAV_ICONS[href] ?? DashboardSVG;
            const fullHref = orgSlug ? `/${orgSlug}${href}` : href;
            const active   = pathname === fullHref || pathname.startsWith(fullHref + '/');
            const translatedLabel = t(labelKey as MessageKey, label);

            const link = (
              <Link
                href={fullHref}
                aria-label={translatedLabel}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-lg text-sm transition-colors duration-150',
                  sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                  active
                    ? 'text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-lg bg-indigo-50 dark:bg-indigo-950/50"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 flex-shrink-0 transition-transform duration-200 ease-out',
                    'group-hover:scale-110',
                    active ? 'text-indigo-700 dark:text-indigo-400' : '',
                  )}
                >
                  <Icon />
                </span>
                <AnimatePresence initial={false}>
                  {!sidebarCollapsed && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, x: isRtl ? 5 : -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isRtl ? 5 : -5 }}
                      transition={{ duration: 0.16, ease: EASE_OUT }}
                      className="relative z-10 whitespace-nowrap"
                    >
                      {translatedLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            if (!sidebarCollapsed) return <div key={href}>{link}</div>;

            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side={isRtl ? 'left' : 'right'}>{translatedLabel}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* User info */}
        {user && (
          <div className="p-3 border-t border-gray-100 dark:border-gray-800">
            <div className={cn('flex items-center gap-2 px-1 py-1', sidebarCollapsed && 'justify-center')}>
              <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                {user.displayName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
              </div>
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.div
                    key="user-meta"
                    initial={{ opacity: 0, x: isRtl ? 5 : -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRtl ? 5 : -5 }}
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user.displayName || user.email}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">{user.role?.replace('_', ' ')}</p>
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
