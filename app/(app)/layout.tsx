'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TransferModeBanner } from '@/components/layout/TransferModeBanner';
import { useTransferStore } from '@/store/transfer.store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { active } = useTransferStore();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user?.role === 'super_admin' && !active) router.push('/super-admin');
  }, [user, loading, router, active]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <AppHeader />
      {active && <TransferModeBanner />}
      <AppSidebar />
      <main className={`ml-60 pt-14 ${active ? 'mt-10' : ''} min-h-screen`}>
        <div className="px-6 py-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
