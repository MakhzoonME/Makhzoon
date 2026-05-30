'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { hasPermByKey } from '@/lib/permissions';

const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin']);

/**
 * Settings index — routes users to the first settings page they can access.
 * Order matches the sidebar so admins land on Organization Info as before.
 * Staff with only a single settings permission land directly on that page
 * instead of bouncing to /organization → useAdminGuard → /dashboard.
 */
const SETTINGS_ORDER: Array<{ permKey: string; path: string }> = [
  { permKey: 'settings.orgInfo',      path: '/settings/organization' },
  { permKey: 'settings.subscription', path: '/subscription' },
  { permKey: 'settings.users',        path: '/users' },
  { permKey: 'settings.taxRates',     path: '/settings/tax-rates' },
  { permKey: 'settings.fawtara',      path: '/settings/jo-fotara' },
];

export default function SettingsIndexPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string }>();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (loading || !user) return;
    const isAdmin = ADMIN_ROLES.has(user.role);
    const base = `/${params.locale}/${params.orgSlug}`;
    if (isAdmin) {
      router.replace(`${base}/settings/organization`);
      return;
    }
    const target = SETTINGS_ORDER.find((s) => hasPermByKey(user, s.permKey));
    // Dashboard is space-scoped; fall back to the org's Default space.
    router.replace(`${base}${target ? target.path : '/default/dashboard'}`);
  }, [loading, user, router, params.locale, params.orgSlug]);

  return (
    <div className="flex items-center justify-center h-48">
      <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
    </div>
  );
}
