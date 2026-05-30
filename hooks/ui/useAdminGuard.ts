'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug } from '@/hooks/ui/useOrgSlug';
import { useSpace } from '@/hooks/ui/useSpace';
import { hasPermByKey } from '@/lib/permissions';

const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin']);

export function useAdminGuard(permissionKey?: string | string[]) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';

  const isAdmin = !!user && ADMIN_ROLES.has(user.role);
  const permKeys = Array.isArray(permissionKey) ? permissionKey : permissionKey ? [permissionKey] : [];
  const hasPermAccess = !!user && !isAdmin && permKeys.some((k) => hasPermByKey(user, k));
  const canAccess = isAdmin || hasPermAccess;

  useEffect(() => {
    if (loading || !user) return;
    if (!canAccess) {
      router.replace(`/${locale}/${orgSlug}/${space}/dashboard`);
    }
  }, [user, loading, canAccess, router, orgSlug, space, locale]);

  const isAllowed = loading || !user || canAccess;

  return { isAllowed, isAdmin };
}
