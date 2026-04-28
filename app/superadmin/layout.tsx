'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SuperAdminBanner } from '@/components/layout/SuperAdminBanner';
import { Building2, FileText, LogOut, LayoutDashboard, Settings, MessageSquare, Users, Activity } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

const ALL_NAV_ITEMS = [
  { href: '/superadmin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  { href: '/superadmin', label: 'Organizations', icon: Building2, roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  { href: '/superadmin/support', label: 'Support', icon: MessageSquare, roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  { href: '/superadmin/configuration', label: 'Configuration', icon: Settings, roles: ['super_admin', 'makhzoon_admin'] },
  { href: '/superadmin/audit-logs', label: 'Audit Logs', icon: FileText, roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
  { href: '/superadmin/team', label: 'Team', icon: Users, roles: ['super_admin', 'makhzoon_admin'] },
  { href: '/superadmin/backend-logs', label: 'Backend Logs', icon: Activity, roles: ['super_admin', 'makhzoon_admin', 'makhzoon_support'] },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !SUPERADMIN_ROLES.has(user.role)) router.push('/');
  }, [user, loading, router]);

  async function handleLogout() {
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(auth);
    router.push('/login');
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );

  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen" style={{ background: '#0F2440' }}>
      <SuperAdminBanner />
      <div className="flex pt-8">
        <aside className="fixed left-0 top-8 bottom-0 w-60 flex flex-col" style={{ background: '#0F2440' }}>
          <div className="px-4 py-4 border-b border-blue-900">
            <div className="flex items-center gap-2">
              <MakhzoonMark size={28} fill="#FFFFFF" glyphFill="#1E3A5F" />
              <span className="text-sm font-semibold text-blue-100">Makhzoon</span>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/superadmin' && pathname.startsWith(href));
              return (
                <Link key={href} href={href} className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  active ? 'bg-blue-800 text-blue-100 font-medium' : 'text-blue-300 hover:bg-blue-900 hover:text-blue-100'
                )}>
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-blue-900">
            <div className="px-3 py-1.5 mb-1">
              <p className="text-xs text-blue-500 truncate">{user.email}</p>
              <p className="text-xs text-blue-400 capitalize">{user.role.replace(/_/g, ' ')}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-blue-300 hover:bg-blue-900 hover:text-blue-100 w-full transition-colors">
              <LogOut className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </div>
        </aside>
        <main className="ml-60 flex-1 min-h-screen bg-gray-50">
          <div className="px-6 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
