'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/ui';
import { AppHeader } from '@/components/layout/AppHeader';
import {
  AppSidebar,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from '@/components/layout/AppSidebar';
import { useT } from '@/hooks/ui';
import { TransferModeBanner } from '@/components/layout/TransferModeBanner';
import { ExpiryWarningBanner } from '@/components/features/subscription';
import { PageTransition } from '@/components/layout/PageTransition';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { useTransferStore } from '@/store/transfer.store';
import { useUiStore } from '@/store/ui.store';

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string }>();
  const locale = params?.locale ?? 'en';
  const orgSlug = params.orgSlug as string;
  const { active, orgName, setTransfer } = useTransferStore();
  const { sidebarCollapsed } = useUiStore();
  const { dir } = useT();
  const isRtl = dir === 'rtl';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/${locale}/login`);
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
  }, [user, loading, router, active, orgSlug, setTransfer, locale]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
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
        className={`pt-14 ${showBanner ? 'mt-10' : ''} min-h-screen pb-16 md:pb-0`}
        style={{
          [isRtl ? 'marginRight' : 'marginLeft']: `${sidebarWidth}px`,
          transition: 'margin 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <ExpiryWarningBanner />
        <div className="px-6 py-6 max-w-7xl">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
