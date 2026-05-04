'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/ui';
import { SuperAdminBanner } from '@/components/layout/SuperAdminBanner';
import { Building2, FileText, LogOut, LayoutDashboard, Settings, MessageSquare, Users, Activity } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { useT } from '@/hooks/ui';
import type { MessageKey } from '@/locales/messages';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const pathname = usePathname();
  const { t, dir } = useT();
  const isRtl = dir === 'rtl';

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const ALL_NAV_ITEMS = [
    { href: '/superadmin/dashboard', labelKey: 'nav.dashboard',    icon: LayoutDashboard, roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
    { href: '/superadmin',           labelKey: 'nav.organizations', icon: Building2,       roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
    { href: '/superadmin/support',   labelKey: 'nav.support',       icon: MessageSquare,   roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
    { href: '/superadmin/configuration', labelKey: 'nav.configuration', icon: Settings,    roles: ['super_admin', 'makhzoon_admin'] },
    { href: '/superadmin/audit-logs',    labelKey: 'nav.auditLogs',     icon: FileText,    roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
    { href: '/superadmin/team',          labelKey: 'nav.team',          icon: Users,       roles: ['super_admin', 'makhzoon_admin'] },
    { href: '/superadmin/backend-logs',  labelKey: 'nav.backendLogs',   icon: Activity,    roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  ];

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    // Org users who somehow land on /superadmin: send to their portal or public home
    if (!loading && user && !SUPERADMIN_ROLES.has(user.role)) {
      router.push(user.orgSlug ? `/${locale}/${user.orgSlug}/dashboard` : `/${locale}`);
    }
  }, [user, loading, router, locale]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      await signOut(auth);
    } catch {
      // ignore — always redirect regardless of errors
    }
    window.location.href = `/${locale}/login`;
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F2440' }}>
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );

  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen" style={{ background: 'var(--sa-page-bg, #0F2440)' }}>
      <SuperAdminBanner />
      <div className="flex pt-8">
        <aside
          className={cn(
            'fixed top-8 bottom-0 w-60 flex flex-col',
            isRtl ? 'right-0' : 'left-0',
          )}
          style={{ background: '#0F2440' }}
        >
          <div className="px-4 py-4 border-b border-blue-900">
            <div className="flex items-center gap-2">
              <MakhzoonMark size={28} fill="#FFFFFF" glyphFill="#1E3A5F" />
              <span className="text-sm font-semibold text-blue-100">Makhzoon</span>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map(({ href, labelKey, icon: Icon }) => {
              const label = t(labelKey as MessageKey);
              const fullHref = `/${locale}${href}`;
              const active = pathname === fullHref || (href !== '/superadmin' && pathname.startsWith(fullHref));
              return (
                <Link key={href} href={fullHref} className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  active ? 'bg-blue-800 text-blue-100 font-medium' : 'text-blue-300 hover:bg-blue-900 hover:text-blue-100'
                )}>
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-blue-900">
            <div className="px-3 py-1.5 mb-1">
              <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><p className="text-xs text-blue-500 truncate">{user.email}</p></TooltipTrigger><TooltipContent>{user.email}</TooltipContent></Tooltip></TooltipProvider>
              <p className="text-xs text-blue-400 capitalize">{user.role.replace(/_/g, ' ')}</p>
            </div>
            <div className="flex items-center gap-1 px-1 mb-1">
              <ThemeToggle variant="ghost-dark" />
              <LanguageToggle variant="ghost-dark" />
            </div>
            <button onClick={handleLogout} disabled={isLoggingOut} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-blue-300 hover:bg-blue-900 hover:text-blue-100 w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <LogOut className="h-[18px] w-[18px]" />
              {isLoggingOut ? '…' : t('common.signOut')}
            </button>
          </div>
        </aside>
        <main
          className="flex-1 min-h-screen bg-gray-50"
          style={isRtl ? { marginRight: '240px' } : { marginLeft: '240px' }}
        >
          <div className="px-6 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
