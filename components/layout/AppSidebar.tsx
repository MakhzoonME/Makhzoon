'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShieldCheck, ClipboardList, Users, CreditCard, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Assets', icon: Package },
  { href: '/warranties', label: 'Warranties', icon: ShieldCheck },
  { href: '/requests', label: 'Requests', icon: ClipboardList },
  { href: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/subscription', label: 'Subscription', icon: CreditCard, adminOnly: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const canSeeAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const visibleItems = navItems.filter((item) => !item.adminOnly || canSeeAdmin);

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-60 bg-white border-r border-gray-200 flex flex-col overflow-y-auto z-30">
      <nav className="flex-1 p-3 space-y-0.5">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
              {user.displayName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user.displayName || user.email}</p>
              <p className="text-[11px] text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
