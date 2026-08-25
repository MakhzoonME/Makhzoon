// Pure add-on entitlement logic, shared between server enforcement
// (lib/permissions/require-module.ts) and client-side nav/guard gating
// (hooks/org/useActiveAddOns.ts). No DB access here — safe for the client
// bundle — so it must not import 'server-only'.
import type { AddOnKey, Package, PackageAllowances, Subscription } from '@/types';

export const ADDON_INCLUDED: Record<AddOnKey, keyof PackageAllowances> = {
  deliveryAgents: 'deliveryAgentsIncluded',
  warrantyCerts: 'warrantyCertsIncluded',
  customization: 'customizationIncluded',
  purchasesRequests: 'purchasesRequestsIncluded',
  vehicleIntake: 'vehicleIntakeIncluded',
};

export const ADDON_LABELS: Record<AddOnKey, string> = {
  deliveryAgents: 'Workers',
  warrantyCerts: 'Warranty certificates',
  customization: 'Customization',
  purchasesRequests: 'Purchases & Requests',
  vehicleIntake: 'Vehicle intake (plate capture)',
};

// A package is "on the new pricing model" once its structured allowances are
// populated (reseed / Business creation). Until then, module/add-on gating is
// a no-op and the legacy feature flags remain the only gate.
export function isPricingModelPackage(pkg: Package | null): pkg is Package {
  return !!pkg && pkg.allowances.usoolIncluded !== null;
}

/** Is this add-on active, either purchased on the subscription or plan-included? */
export function isAddOnActive(
  sub: Pick<Subscription, 'packageId' | 'activeAddOns'> | null | undefined,
  pkg: Package | null,
  addOn: AddOnKey,
): boolean {
  if (!sub?.packageId) return true; // no package / trial = allowed
  if (sub.activeAddOns?.[addOn]) return true; // purchased
  if (!pkg) return true; // package not loaded — don't block on missing data
  // Note: unlike the numeric pricing-model allowances (usool/raseed, gated by
  // isPricingModelPackage), the add-on include flags are `not null default
  // false`, so every package — migrated or not — has a real value here. Gating
  // this on isPricingModelPackage would make the per-org purchase checkbox a
  // no-op (always active) for any org on a not-yet-migrated package.
  return !!pkg.allowances[ADDON_INCLUDED[addOn]]; // included in plan
}

/** All add-on flags at once, for exposing merged entitlements to the client. */
export function getActiveAddOns(
  sub: Pick<Subscription, 'packageId' | 'activeAddOns'> | null | undefined,
  pkg: Package | null,
): Record<AddOnKey, boolean> {
  const keys = Object.keys(ADDON_INCLUDED) as AddOnKey[];
  return Object.fromEntries(
    keys.map((k) => [k, isAddOnActive(sub, pkg, k)]),
  ) as Record<AddOnKey, boolean>;
}
