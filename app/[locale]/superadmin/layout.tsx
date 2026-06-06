'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/ui';
import { Building2, FileText, LogOut, LayoutDashboard, Settings, MessageSquare, Users, Activity, Mail, RefreshCw, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { NetworkStatusIndicator } from '@/components/shared/NetworkStatusIndicator';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { buildOrgPath } from '@/lib/utils/tenant-url';
import { createClient } from '@/lib/supabase/client';
import { useTransferStore } from '@/store/transfer.store';
import { useUiStore } from '@/store/ui.store';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { useT } from '@/hooks/ui';
import { motion } from 'framer-motion';
import type { MessageKey } from '@/locales/messages';

const SA_EXPANDED  = 240;
const SA_COLLAPSED = 68;
const EASE_SLIDE = [0.4, 0, 0.2, 1] as const;

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

type NavEntry =
  | { separator: true }
  | { href: string; labelKey: string; icon: React.ElementType; roles: string[]; separator?: false };

const ALL_NAV_ITEMS = (locale: string): NavEntry[] => [
  { href: `/${locale}/superadmin/dashboard`,     labelKey: 'nav.dashboard',     icon: LayoutDashboard, roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  { href: `/${locale}/superadmin`,               labelKey: 'nav.organizations', icon: Building2,       roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  { href: `/${locale}/superadmin/leads`,         labelKey: 'nav.leads',         icon: Mail,            roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  { href: `/${locale}/superadmin/lists`,         labelKey: 'nav.lists',         icon: FileText,        roles: ['super_admin', 'makhzoon_admin'] },
  { href: `/${locale}/superadmin/packages`,      labelKey: 'nav.packages',      icon: Package,         roles: ['super_admin', 'makhzoon_admin'] },
  { href: `/${locale}/superadmin/configuration`, labelKey: 'nav.configuration', icon: Settings,        roles: ['super_admin', 'makhzoon_admin'] },
  { separator: true },
  { href: `/${locale}/superadmin/support`,       labelKey: 'nav.support',       icon: MessageSquare,   roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  { href: `/${locale}/superadmin/team`,          labelKey: 'nav.team',          icon: Users,           roles: ['super_admin', 'makhzoon_admin'] },
  { href: `/${locale}/superadmin/backend-logs`,  labelKey: 'nav.backendLogs',   icon: Activity,        roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  { href: `/${locale}/superadmin/sync`,          labelKey: 'nav.sync',          icon: RefreshCw,       roles: ['super_admin', 'makhzoon_admin'] },
  { href: `/${locale}/superadmin/audit-logs`,    labelKey: 'nav.auditLogs',     icon: FileText,        roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const { t, dir } = useT();
  const isRtl = dir === 'rtl';
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { superAdminSidebarCollapsed: collapsed, toggleSuperAdminSidebar, headerTitle, headerBreadcrumb } = useUiStore();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    if (!loading && user && !SUPERADMIN_ROLES.has(user.role)) {
      router.push(user.orgSlug ? buildOrgPath(locale, user.orgSlug) : `/${locale}`);
    }
  }, [user, loading, router, locale]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      const supabase = await createClient(); await supabase.auth.signOut();
    } catch {
      // ignore — always redirect regardless of errors
    }
    useTransferStore.getState().clearTransfer();
    window.location.href = `/${locale}/login`;
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F2440' }}>
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );

  const navItems = ALL_NAV_ITEMS(locale).filter((item) =>
    'separator' in item ? true : item.roles.includes(user.role)
  );

  const sidebarW = collapsed ? SA_COLLAPSED : SA_EXPANDED;

  return (
    <div className="min-h-screen" style={{ background: 'var(--sa-page-bg, #0F2440)' }}>
      <div className="flex">
        {/* Mobile overlay backdrop */}
        {isMobile && mobileNavOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <motion.aside
          initial={false}
          animate={{ width: isMobile ? SA_EXPANDED : sidebarW }}
          transition={{ duration: 0.26, ease: EASE_SLIDE }}
          className={cn(
            'fixed top-0 bottom-0 flex flex-col overflow-visible z-30',
            isRtl ? 'right-0' : 'left-0',
            isMobile && !mobileNavOpen && 'hidden',
          )}
          style={{ background: '#0F2440', willChange: 'width' }}
        >
          {/* Collapse toggle */}
          <button
            onClick={toggleSuperAdminSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-20',
              'h-5 w-5 rounded-full bg-blue-900 border border-blue-700 shadow-sm',
              'flex items-center justify-center text-blue-300',
              'hover:text-blue-100 hover:border-blue-500 transition-all duration-200',
              isRtl ? '-left-2.5' : '-right-2.5',
            )}
          >
            {isRtl
              ? (collapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)
              : (collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />)
            }
          </button>

          {/* Logo */}
          <div className="px-4 py-4 border-b border-blue-900 flex items-center gap-2 overflow-hidden">
            <MakhzoonMark size={28} fill="#FFFFFF" glyphFill="#1E3A5F" className="flex-shrink-0" />
            <motion.span
              animate={{ width: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
              transition={collapsed
                ? { width: { duration: 0.18, ease: EASE_SLIDE }, opacity: { duration: 0.08 } }
                : { width: { duration: 0.22, ease: EASE_SLIDE }, opacity: { duration: 0.14, delay: 0.14 } }
              }
              className="overflow-hidden flex flex-col"
              style={{ minWidth: 0 }}
            >
              <span className="text-sm font-bold text-blue-100 whitespace-nowrap leading-tight">
                {t('brand.name')}
              </span>
              <span className="text-[9px] font-semibold text-blue-400 uppercase tracking-widest whitespace-nowrap leading-tight">
                Platform Console
              </span>
            </motion.span>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
            {navItems.map((item, idx) => {
              if ('separator' in item) {
                return <div key={`sep-${idx}`} className="my-1.5 mx-2 border-t border-blue-800/60" />;
              }
              const { href, labelKey, icon: Icon } = item;
              const label = t(labelKey as MessageKey);
              const isExactOnly = href === `/${locale}/superadmin/dashboard` || href === `/${locale}/superadmin`;
              const active = pathname === href || (!isExactOnly && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'group relative flex items-center rounded-lg text-sm transition-colors duration-150 h-9 ps-[25px]',
                    active ? 'bg-blue-800/80 text-blue-100 font-medium' : 'text-blue-300 hover:bg-blue-900 hover:text-blue-100',
                  )}
                >
                  {active && (
                    <span className={cn(
                      'absolute top-1.5 bottom-1.5 w-0.5 rounded-full bg-blue-300',
                      isRtl ? 'right-0' : 'left-0',
                    )} />
                  )}
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  <motion.span
                    animate={{ width: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
                    transition={collapsed
                      ? { width: { duration: 0.18, ease: EASE_SLIDE }, opacity: { duration: 0.08 } }
                      : { width: { duration: 0.22, ease: EASE_SLIDE }, opacity: { duration: 0.14, delay: 0.14 } }
                    }
                    className="whitespace-nowrap overflow-hidden ms-2.5"
                    style={{ minWidth: 0 }}
                  >
                    {label}
                  </motion.span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer — logo/identity only */}
          <div className="p-3 border-t border-blue-900 overflow-hidden">
            <div className={cn('flex items-center gap-2 px-1', collapsed && 'justify-center')}>
              <div className="h-7 w-7 rounded-full bg-blue-800 flex items-center justify-center text-xs font-semibold text-blue-200 flex-shrink-0">
                {(user.displayName || user.email)?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <motion.div
                animate={{ width: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
                transition={collapsed
                  ? { width: { duration: 0.18, ease: EASE_SLIDE }, opacity: { duration: 0.08 } }
                  : { width: { duration: 0.22, ease: EASE_SLIDE }, opacity: { duration: 0.14, delay: 0.14 } }
                }
                className="overflow-hidden"
                style={{ minWidth: 0 }}
              >
                <p className="text-xs text-blue-200 truncate whitespace-nowrap">{user.displayName || user.email}</p>
                <p className="text-xs text-blue-400 capitalize whitespace-nowrap">
                  {
                    user.role === 'super_admin'      ? t('role.superAdmin') :
                    user.role === 'makhzoon_admin'   ? t('role.makhzoonAdmin') :
                    user.role === 'makhzoon_support' ? t('role.makhzoonSupport') :
                    user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  }
                </p>
              </motion.div>
            </div>
          </div>
        </motion.aside>

        <main
          className="flex-1 min-h-screen bg-surface-page transition-all duration-[260ms] overflow-x-hidden"
          style={!isMobile ? (isRtl ? { marginRight: sidebarW } : { marginLeft: sidebarW }) : undefined}
        >
          {/* Top nav bar — fixed to the viewport, sidebar-aware offset so it stays accessible on every page */}
          <div
            className="fixed top-0 z-20 h-12 flex items-center justify-between px-4 gap-3 transition-[left,right] duration-[260ms]"
            style={{
              background: '#0D1F36',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              ...(isMobile
                ? { left: 0, right: 0 }
                : isRtl
                ? { right: sidebarW, left: 0 }
                : { left: sidebarW, right: 0 }),
            }}
          >
            {/* Left: mobile hamburger OR desktop title */}
            <div className="flex items-center gap-3">
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(v => !v)}
                  className="text-blue-300 hover:text-blue-100 p-1.5 rounded-md hover:bg-blue-900/50 transition-colors"
                  aria-label={t('common.menu')}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <rect x="1" y="3.5" width="16" height="1.5" rx="0.75" fill="currentColor" />
                    <rect x="1" y="8.25" width="16" height="1.5" rx="0.75" fill="currentColor" />
                    <rect x="1" y="13" width="16" height="1.5" rx="0.75" fill="currentColor" />
                  </svg>
                </button>
              )}
              {headerTitle ? (
                <div className="hidden sm:flex flex-col justify-center min-w-0">
                  {(() => {
                    const crumbs = headerBreadcrumb.slice(0);
                    const moduleName = crumbs[0]?.label ?? headerTitle;
                    const pageName   = crumbs.length > 1 ? crumbs[crumbs.length - 1]?.label : null;
                    return (
                      <>
                        <p className="text-[14px] font-semibold text-blue-100 leading-tight truncate">{moduleName}</p>
                        {pageName && pageName !== moduleName && (
                          <p className="text-[11px] text-blue-400 leading-tight truncate">{pageName}</p>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <span className="text-sm font-semibold text-blue-100 hidden sm:block">{t('role.superAdmin')}</span>
              )}
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-1">
              <NetworkStatusIndicator variant="ghost-dark" />
              <ThemeToggle variant="ghost-dark" />
              <LanguageToggle variant="ghost-dark" />
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-blue-300 hover:text-blue-100 hover:bg-blue-900/50 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:block">{isLoggingOut ? '…' : t('common.signOut')}</span>
              </button>
            </div>
          </div>

          <div className="px-6 pt-[72px] pb-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
