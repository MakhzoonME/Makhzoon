'use client';
import { useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug } from '@/hooks/ui/useOrgSlug';
import { useSpace } from '@/hooks/ui/useSpace';
import { hasModuleAccess, hasPermission } from '@/lib/permissions';
import { getFirstAccessiblePath, navFeatureAllowed } from '@/lib/nav';
import type { UserPermissions } from '@/types/user-permissions.types';
import type { AddOnKey, HarakaModule } from '@/types/subscription.types';

const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin', 'makhzoon_admin', 'makhzoon_support']);

export function useModuleGuard(opts: {
  featureKey?: string;
  /**
   * ANY-OF feature gate, for a page more than one vertical reaches (the report
   * template builder serves a Haraka retailer and a Zeyara clinic alike).
   * Wins over `featureKey` when set. Mirrors navFeatureAllowed() in lib/nav.
   */
  featureKeys?: string[];
  moduleKey?: keyof UserPermissions;
  /** Operation to check within moduleKey instead of the module's 'view' gate. */
  permOp?: string;
  adminOnly?: boolean;
  /** Haraka sub-module (Orders/Services/Appointments/Retainers) this page requires be active on the subscription. */
  harakaModule?: HarakaModule;
  /** Independent add-on (Workers/Warranty Certs/…) this page requires be active on the subscription. */
  harakaAddOn?: AddOnKey;
}) {
  const { featureKey, featureKeys, moduleKey, permOp, adminOnly, harakaModule, harakaAddOn } = opts;
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
    if (!navFeatureAllowed({ featureKey, featureKeys }, user.features ?? {})) return false;
    if (harakaModule && !user.activeHarakaModules?.includes(harakaModule)) return false;
    if (harakaAddOn && !user.activeAddOns?.[harakaAddOn]) return false;
    // Check module permissions for staff always, and for admins when they have
    // stored custom permissions (which may restrict their access).
    if (moduleKey && (user.role === 'staff' || (isAdmin && user.permissions))) {
      const u = { ...user, organizationId: user.organizationId ?? null };
      return permOp ? hasPermission(u, moduleKey, permOp) : hasModuleAccess(u, moduleKey);
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
        activeHarakaModules: user.activeHarakaModules ?? [],
        activeAddOns: user.activeAddOns,
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
