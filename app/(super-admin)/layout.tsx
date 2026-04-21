'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SuperAdminBanner } from '@/components/layout/SuperAdminBanner';
import { Building2, FileText, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

const navItems = [
  { href: '/super-admin', label: 'Organizations', icon: Building2 },
  { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: FileText },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'super_admin') router.push('/dashboard');
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

  return (
    <div className="min-h-screen" style={{ background: '#0F2440' }}>
      <SuperAdminBanner />
      <div className="flex pt-8">
        <aside className="fixed left-0 top-8 bottom-0 w-60 flex flex-col" style={{ background: '#0F2440' }}>
          <div className="px-4 py-4 border-b border-blue-900">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-blue-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">OA</span>
              </div>
              <span className="text-sm font-semibold text-blue-100">Office Assets</span>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/super-admin' && pathname.startsWith(href));
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
