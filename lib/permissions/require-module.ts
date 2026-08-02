import 'server-only';
import { NextResponse } from 'next/server';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { HarakaModule, Package, PackageAllowances } from '@/types';
import { HARAKA_MODULE_LABELS } from '@/types';
import { getPackageById } from '@/lib/db/packages';

// A package is "on the new pricing model" once its structured allowances are
// populated (reseed / Business creation). Until then, module/add-on gating is a
// no-op and the legacy feature flags (requireFeature) remain the only gate —
// so wiring these guards in ahead of the reseed changes nothing for live orgs.
function isPricingModelPackage(pkg: Package | null): pkg is Package {
  return !!pkg && pkg.allowances.usoolIncluded !== null;
}

/**
 * Gate a Haraka sub-module (POS / Services / Orders / Retainers). A module is
 * active when it's in the subscription's active_haraka_modules or purchased as
 * an extra add-on. No package / trial = allowed (mirrors checkResourceLimit).
 */
export async function requireHarakaModule(
  tenant: TenantContext,
  module: HarakaModule,
): Promise<void> {
  const sub = tenant.subscription;
  if (!sub?.packageId) return;
  const pkg = await getPackageById(sub.packageId);
  if (!isPricingModelPackage(pkg)) return; // not migrated yet — legacy flags only

  const active = new Set<HarakaModule>([
    ...(sub.activeHarakaModules ?? []),
    ...(sub.activeAddOns?.extraHarakaModules ?? []),
  ]);
  if (!active.has(module)) {
    throw NextResponse.json(
      {
        error: `The ${HARAKA_MODULE_LABELS[module]} module isn't part of your plan. Upgrade or add it to enable it.`,
        module,
        code: 'MODULE_NOT_ACTIVE',
      },
      { status: 403 },
    );
  }
}

export type AddOnKey =
  | 'deliveryAgents'
  | 'warrantyCerts'
  | 'customization'
  | 'purchasesRequests';

const ADDON_INCLUDED: Record<AddOnKey, keyof PackageAllowances> = {
  deliveryAgents: 'deliveryAgentsIncluded',
  warrantyCerts: 'warrantyCertsIncluded',
  customization: 'customizationIncluded',
  purchasesRequests: 'purchasesRequestsIncluded',
};

const ADDON_LABELS: Record<AddOnKey, string> = {
  deliveryAgents: 'Delivery agents',
  warrantyCerts: 'Warranty certificates',
  customization: 'Customization',
  purchasesRequests: 'Purchases & Requests',
};

/**
 * Gate an independent add-on. Active when the plan includes it OR it's been
 * purchased on the subscription. No package / non-new-model = allowed.
 */
export async function requireAddOn(
  tenant: TenantContext,
  addOn: AddOnKey,
): Promise<void> {
  const sub = tenant.subscription;
  if (!sub?.packageId) return;
  if (sub.activeAddOns?.[addOn]) return; // purchased
  const pkg = await getPackageById(sub.packageId);
  if (!isPricingModelPackage(pkg)) return; // not migrated yet — legacy flags only
  if (pkg.allowances[ADDON_INCLUDED[addOn]]) return; // included in plan
  throw NextResponse.json(
    {
      error: `${ADDON_LABELS[addOn]} isn't part of your plan. Add it to enable it.`,
      addOn,
      code: 'ADDON_NOT_ACTIVE',
    },
    { status: 403 },
  );
}
