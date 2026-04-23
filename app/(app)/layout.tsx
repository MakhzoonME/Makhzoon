'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TransferModeBanner } from '@/components/layout/TransferModeBanner';
import { useTransferStore } from '@/store/transfer.store';
import { currentSubdomain, buildRootUrl } from '@/lib/utils/tenant-url';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { active, orgName, setTransfer } = useTransferStore();
  const [onSubdomain, setOnSubdomain] = useState<boolean | null>(null);

  useEffect(() => {
    setOnSubdomain(!!currentSubdomain(window.location.host));
  }, []);

  useEffect(() => {
    if (loading || onSubdomain === null) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role === 'super_admin' && !active && !onSubdomain) {
      window.location.href = buildRootUrl('/super-admin');
    }
  }, [user, loading, router, active, onSubdomain]);

  useEffect(() => {
    if (!user || user.role !== 'super_admin' || active || !onSubdomain) return;
    const sub = currentSubdomain(window.location.host);
    if (!sub) return;
    fetch(`/api/organizations/by-subdomain/${encodeURIComponent(sub)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id && data?.name) setTransfer(data.id, data.name, data.subdomain ?? sub);
      })
      .catch(() => {});
  }, [user, active, onSubdomain, setTransfer]);

  if (loading || !user || onSubdomain === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const showBanner = user.role === 'super_admin' && (active || onSubdomain);

  return (
    <div className="min-h-screen bg-surface-page">
      <AppHeader orgName={orgName ?? undefined} />
      {showBanner && <TransferModeBanner />}
      <AppSidebar />
      <main className={`ml-60 pt-14 ${showBanner ? 'mt-10' : ''} min-h-screen`}>
        <div className="px-6 py-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
