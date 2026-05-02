'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug } from '@/hooks/ui/useOrgSlug';
import { hasPermByKey } from '@/lib/permissions';

const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin']);

/**
 * Redirects non-admin org users to the dashboard.
 * Pass a dot-separated `permissionKey` (e.g. 'settings.orgInfo') to also allow
 * staff users who have been granted that specific permission.
 *
 * Must be called unconditionally inside the component (before any conditional returns).
 * Returns `isAllowed: true` while auth is still loading to prevent flash.
 */
export function useAdminGuard(permissionKey?: string) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const orgSlug = useOrgSlug();

  const isAdmin = !!user && ADMIN_ROLES.has(user.role);
  const hasPermAccess = !!permissionKey && !!user && !isAdmin && hasPermByKey(user, permissionKey);
  const canAccess = isAdmin || hasPermAccess;

  useEffect(() => {
    if (loading || !user) return;
    if (!canAccess) {
      router.replace(`/${orgSlug}/dashboard`);
    }
  }, [user, loading, canAccess, router, orgSlug]);

  const isAllowed = loading || !user || canAccess;

  return { isAllowed, isAdmin };
}
