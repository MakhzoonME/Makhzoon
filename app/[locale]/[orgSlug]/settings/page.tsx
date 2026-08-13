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
  { permKey: 'settingsOrgInfo.view',      path: '/settings/organization' },
  { permKey: 'settingsSpaces.view',       path: '/settings/spaces' },
  { permKey: 'settingsLists.view',        path: '/settings/lists' },
  { permKey: 'settingsSubscription.view', path: '/subscription' },
  { permKey: 'settingsUsers.view',        path: '/users' },
  { permKey: 'settingsTaxRates.view',     path: '/settings/tax-rates' },
  { permKey: 'settingsFawtara.view',      path: '/settings/jo-fotara' },
  { permKey: 'settingsReceipt.view',      path: '/settings/receipt' },
  { permKey: 'settingsInvoice.view',      path: '/settings/invoice' },
  { permKey: 'settingsWarrantyCert.view', path: '/settings/warranty-cert' },
  { permKey: 'settingsNotifications.view',path: '/settings/notifications' },
  { permKey: 'settingsCashDrawer.view',   path: '/settings/cash-drawer' },
  { permKey: 'settingsCardTerminal.view', path: '/settings/card-terminal' },
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
