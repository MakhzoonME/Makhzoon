'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShieldCheck,
  ClipboardList,
  Users,
  CreditCard,
  BarChart3,
  MessageCircle,
  History,
  ChevronsLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { useSubscriptionFeatures } from '@/hooks/useSubscriptionFeatures';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  featureKey?: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Assets', icon: Package },
  { href: '/warranties', label: 'Warranties', icon: ShieldCheck, featureKey: 'warranties' },
  { href: '/requests', label: 'Requests', icon: ClipboardList, featureKey: 'requests' },
  { href: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/subscription', label: 'Subscription', icon: CreditCard, adminOnly: true },
  { href: '/support', label: 'Support', icon: MessageCircle, featureKey: 'support' },
  { href: '/audit-logs', label: 'Audit Logs', icon: History, adminOnly: true },
];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const SIDEBAR_WIDTH_EXPANDED = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const features = useSubscriptionFeatures();

  const canSeeAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && !canSeeAdmin) return false;
    // Hide only when explicitly disabled; empty features object = show all
    if (item.featureKey && features[item.featureKey] === false) return false;
    return true;
  });

  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={200}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="fixed left-0 top-14 bottom-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden z-30"
        style={{ contain: 'layout style' }}
      >
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const fullHref = orgSlug ? `/${orgSlug}${href}` : href;
            const active = pathname === fullHref || pathname.startsWith(fullHref + '/');
            const link = (
              <Link
                href={fullHref}
                aria-label={label}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg text-sm transition-colors duration-150',
                  sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                  active
                    ? 'text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-lg bg-indigo-50"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 relative z-10 transition-transform duration-200 ease-out',
                    'group-hover:scale-110',
                    active && 'text-indigo-700'
                  )}
                />
                <AnimatePresence initial={false}>
                  {!sidebarCollapsed && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.18, ease: EASE_OUT }}
                      className="relative z-10 whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            if (!sidebarCollapsed) return <div key={href}>{link}</div>;

            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="border-t border-gray-200">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={sidebarCollapsed}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50',
              'transition-colors duration-150',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <motion.span
              animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="flex-shrink-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </motion.span>
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.span
                  key="collapse-label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {user && (
          <div className="p-3 border-t border-gray-200">
            <div
              className={cn(
                'flex items-center gap-2 px-1 py-1.5',
                sidebarCollapsed && 'justify-center'
              )}
            >
              <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 flex-shrink-0">
                {user.displayName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
              </div>
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.div
                    key="user-meta"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {user.displayName || user.email}
                    </p>
                    <p className="text-[11px] text-gray-500 capitalize">{user.role}</p>
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
