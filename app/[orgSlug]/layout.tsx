'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import {
  AppSidebar,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from '@/components/layout/AppSidebar';
import { TransferModeBanner } from '@/components/layout/TransferModeBanner';
import { ExpiryWarningBanner } from '@/components/shared/ExpiryWarningBanner';
import { PageTransition } from '@/components/layout/PageTransition';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { useTransferStore } from '@/store/transfer.store';
import { useUiStore } from '@/store/ui.store';

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { active, orgName, setTransfer } = useTransferStore();
  const { sidebarCollapsed } = useUiStore();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    // Super admin visiting an org path without an active transfer → auto-enter transfer mode
    if (user.role === 'super_admin' && !active) {
      fetch(`/api/organizations/by-subdomain/${encodeURIComponent(orgSlug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.id && data?.name) setTransfer(data.id, data.name, data.subdomain ?? orgSlug);
        })
        .catch(() => {});
    }
  }, [user, loading, router, active, orgSlug, setTransfer]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const showBanner = user.role === 'super_admin' && active;
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div className="min-h-screen bg-surface-page">
      <AppHeader orgName={orgName ?? undefined} />
      {showBanner && <TransferModeBanner />}
      <AppSidebar />
      <MobileDrawer />
      <BottomNav />
      <main
        className={`pt-14 ${showBanner ? 'mt-10' : ''} min-h-screen transition-[margin-left] duration-350 ease-out-expo pb-16 md:pb-0 [margin-left:0] md:[margin-left:var(--sidebar-w)]`}
        style={{ '--sidebar-w': `${sidebarWidth}px` } as React.CSSProperties}
      >
        <ExpiryWarningBanner />
        <div className="px-6 py-6 max-w-7xl">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
