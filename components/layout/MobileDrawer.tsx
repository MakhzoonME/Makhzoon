'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { useSubscriptionFeatures } from '@/hooks/useSubscriptionFeatures';
import { auth } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';

function DashboardSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="2" width="6" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="10" y="2" width="6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="10" y="8" width="6" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="2" y="11" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>; }
function AssetsSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M15 5.5L9 2.5 3 5.5v7L9 15.5l6-3v-7z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M9 2.5v13M3 5.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function InventorySVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="5" width="14" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M6 10h6M9 8v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function WarrantySVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M9 1.5L2.5 4v6.5C2.5 13.8 5.5 16.5 9 17.5c3.5-1 6.5-3.7 6.5-7V4L9 1.5z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function RequestsSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="2" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M5 6h8M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function ReportsSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.6" /><rect x="7.5" y="9" width="3" height="7" rx="0.5" fill="currentColor" opacity="0.75" /><rect x="13" y="5" width="3" height="11" rx="0.5" fill="currentColor" /><path d="M3.5 11L7.5 7l4 3L16 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function UsersSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M2 15c0-2.761 2.239-4.5 5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" /><path d="M16 15c0-2.209-1.343-3.5-3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function SubscriptionSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="4.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M2 8h14" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 11.5h2M10 11.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function SupportSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M3 12.5V14l2-1.5h9a1.5 1.5 0 0 0 1.5-1.5V5A1.5 1.5 0 0 0 14 3.5H4A1.5 1.5 0 0 0 2.5 5v6A1.5 1.5 0 0 0 4 12.5h-1z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 7.5h6M6 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function AuditSVG() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M3 3l2.5 2.5M3 9h2M3 13h2M9 3v2M13 3l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="9" cy="10.5" r="4.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M7.5 10.5l1.5 1.5 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function XSvg() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function LogOutSVG() { return <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M9 4.5L12 7l-3 2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

interface NavItem { href: string; label: string; Icon: React.FC; adminOnly?: boolean; featureKey?: string; }

const navItems: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',    Icon: DashboardSVG,                            featureKey: 'dashboard' },
  { href: '/assets',       label: 'Assets',       Icon: AssetsSVG,                               featureKey: 'assets' },
  { href: '/inventory',    label: 'Inventory',    Icon: InventorySVG,                            featureKey: 'inventory' },
  { href: '/warranties',   label: 'Warranties',   Icon: WarrantySVG,    featureKey: 'warranties' },
  { href: '/requests',     label: 'Requests',     Icon: RequestsSVG,    featureKey: 'requests' },
  { href: '/reports',      label: 'Reports',      Icon: ReportsSVG,     adminOnly: true,         featureKey: 'reports' },
  { href: '/users',        label: 'Users',        Icon: UsersSVG,       adminOnly: true },
  { href: '/subscription', label: 'Subscription', Icon: SubscriptionSVG, adminOnly: true },
  { href: '/support',      label: 'Support',      Icon: SupportSVG,     featureKey: 'support' },
  { href: '/audit-logs',   label: 'Audit Logs',   Icon: AuditSVG,       adminOnly: true,         featureKey: 'auditLogs' },
];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function MobileDrawer() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { user } = useAuthStore();
  const { mobileMenuOpen, setMobileMenuOpen } = useUiStore();
  const features = useSubscriptionFeatures();

  const canSeeAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && !canSeeAdmin) return false;
    if (item.featureKey && features[item.featureKey] === false) return false;
    return true;
  });

  async function handleLogout() {
    setMobileMenuOpen(false);
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(auth);
    router.push('/login');
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
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-white flex flex-col shadow-xl md:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MakhzoonMark size={24} />
                <span className="text-sm font-semibold text-gray-900">Makhzoon</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <XSvg />
              </button>
            </div>

            {/* User info */}
            {user && (
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 flex-shrink-0">
                    {user.displayName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || user.email}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
              {visibleItems.map(({ href, label, Icon }) => {
                const fullHref = `/${orgSlug}${href}`;
                const active = pathname === fullHref || pathname.startsWith(fullHref + '/');
                return (
                  <Link
                    key={href}
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
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
              >
                <LogOutSVG />
                <span>Sign out</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
