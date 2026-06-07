'use client';
import { useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug } from '@/hooks/ui/useOrgSlug';
import { useSpace } from '@/hooks/ui/useSpace';
import { hasModuleAccess } from '@/lib/permissions';
import { getFirstAccessiblePath } from '@/lib/nav';
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
  const pathname = usePathname();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const params = useParams<{ locale: string }>();
  const locale = (params?.locale as string) ?? 'en';

  const isAdmin = !!user && ADMIN_ROLES.has(user.role);

  const canAccess = (() => {
    if (!user) return true;
    if (adminOnly && !isAdmin) return false;
    if (featureKey && !user.features?.[featureKey]) return false;
    // Check module permissions for staff always, and for admins when they have
    // stored custom permissions (which may restrict their access).
    if (moduleKey && (user.role === 'staff' || (isAdmin && user.permissions))) {
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
      const fallback = getFirstAccessiblePath({
        locale,
        orgSlug,
        space,
        role: user.role,
        features: user.features ?? {},
        permissions: user.permissions as Record<string, Record<string, boolean>> | null | undefined,
      });
      // guard against redirecting to the same page (e.g. when user has zero features)
      if (fallback !== pathname) {
        router.replace(fallback);
      }
    }
  }, [user, loading, canAccess, router, orgSlug, space, locale, pathname]);

  return { isAllowed: loading || !user || canAccess };
}
