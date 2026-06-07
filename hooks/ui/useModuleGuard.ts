'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug } from '@/hooks/ui/useOrgSlug';
import { useSpace } from '@/hooks/ui/useSpace';
import { hasModuleAccess } from '@/lib/permissions';
import type { UserPermissions } from '@/types/user-permissions.types';

const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin', 'makhzoon_admin', 'makhzoon_support']);

export function useModuleGuard(opts: {
  featureKey?: string;
  moduleKey?: keyof UserPermissions;
  adminOnly?: boolean;
}) {
  const { featureKey, moduleKey, adminOnly } = opts;
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const params = useParams<{ locale: string }>();
  const locale = (params?.locale as string) ?? 'en';

  const isAdmin = !!user && ADMIN_ROLES.has(user.role);

  const canAccess = (() => {
    if (!user) return true;
    if (adminOnly && !isAdmin) return false;
    if (featureKey && !user.features?.[featureKey]) return false;
    if (!isAdmin && user.role === 'staff' && moduleKey) {
      return hasModuleAccess(
        { ...user, organizationId: user.organizationId ?? null },
        moduleKey,
      );
    }
    return true;
  })();

  useEffect(() => {
    if (loading || !user) return;
    if (!canAccess) {
      router.replace(`/${locale}/${orgSlug}/${space}/dashboard`);
    }
  }, [user, loading, canAccess, router, orgSlug, space, locale]);

  return { isAllowed: loading || !user || canAccess };
}
