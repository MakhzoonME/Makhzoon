import 'server-only';
import { NextResponse } from 'next/server';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import { VERTICAL_FEATURE_KEYS } from '@/lib/platform/verticals';

/**
 * Server-side subscription feature-flag enforcement (audit finding S3).
 *
 * Mirrors the UI gate in useModuleGuard: a feature key that is missing or
 * false on the org's subscription blocks the module for EVERYONE in the org
 * (feature OFF beats role/permissions; super_admin in transfer mode sees the
 * target org's features, same as the UI). Keys are listed in
 * docs/modules-and-features/12-subscription.md.
 */
export function requireFeature(tenant: TenantContext, featureKey: string): void {
  const features = tenant.subscription?.features ?? {};
  if (!features[featureKey]) {
    throw NextResponse.json(
      { error: 'Feature not enabled for this organization', feature: featureKey },
      { status: 403 },
    );
  }
}

/**
 * Gate a route on the SHARED appointment/catalog/customer engine, which more
 * than one vertical may be entitled to reach. Passes when the org holds any
 * one of the registered vertical feature keys.
 *
 * Use this only on genuinely shared routes. Haraka-exclusive surfaces —
 * register, orders, warranty certs, cash drawer, card terminal — keep the
 * strict requireFeature(tenant, 'pos') gate.
 */
export function requireAnyVerticalFeature(tenant: TenantContext): void {
  const features = tenant.subscription?.features ?? {};
  if (VERTICAL_FEATURE_KEYS.some((k) => features[k])) return;
  throw NextResponse.json(
    {
      error: 'Feature not enabled for this organization',
      feature: VERTICAL_FEATURE_KEYS.join('|'),
    },
    { status: 403 },
  );
}

/**
 * Same check for routes that authenticate without resolveTenant()
 * (e.g. audit-logs, which use verifySessionCookie directly).
 */
export async function requireFeatureForOrg(
  organizationId: string,
  featureKey: string,
): Promise<void> {
  const subscription = await getSubscriptionByOrg(organizationId);
  if (!subscription?.features?.[featureKey]) {
    throw NextResponse.json(
      { error: 'Feature not enabled for this organization', feature: featureKey },
      { status: 403 },
    );
  }
}
