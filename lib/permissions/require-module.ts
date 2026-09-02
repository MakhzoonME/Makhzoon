import 'server-only';
import { NextResponse } from 'next/server';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { AddOnKey, HarakaModule } from '@/types';
import { HARAKA_MODULE_LABELS } from '@/types';
import { getPackageById } from '@/lib/db/packages';
import { ADDON_LABELS, isAddOnActive, isPricingModelPackage } from '@/lib/platform/entitlements';

export { getActiveAddOns, isAddOnActive } from '@/lib/platform/entitlements';

/**
 * Haraka sub-modules that Zeyara reaches through the SAME shared routes
 * (appointments, service catalog). Zeyara buys the appointment + catalog
 * surface as part of the vertical itself — it has no "Choose N Haraka
 * modules" à la carte concept — so a Zeyara-only org's package never has
 * these in `activeHarakaModules`. Without this carve-out, a Zeyara org would
 * be 403'd out of the very engine it bought the first time it hit a shared
 * appointments/services route. See
 * docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §11.2. Additive
 * only: a Haraka-only org (no 'zeyara' feature) is unaffected.
 */
const ZEYARA_IMPLIED_MODULES: HarakaModule[] = ['appointments', 'services'];

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
  if (ZEYARA_IMPLIED_MODULES.includes(module) && !!sub.features?.zeyara) return;
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

/**
 * Gate the staff directory on the Workers add-on.
 *
 * For Haraka, "Workers" are delivery agents: an optional extra, so appointments
 * fall back to being created without a staff provider when it is off (see
 * createAppointmentSchema).
 *
 * Zeyara's Providers directory is the same `haraka_staff` table reached
 * through the same routes, but providers are core to the vertical, not an
 * optional add-on the way delivery agents are for Haraka — so a Zeyara org
 * bypasses this add-on check the same way it bypasses ZEYARA_IMPLIED_MODULES
 * above. Additive: a Haraka-only org still requires the add-on as before.
 */
export async function requireStaffAccess(tenant: TenantContext): Promise<void> {
  if (tenant.subscription?.features?.zeyara) return;
  await requireAddOn(tenant, 'deliveryAgents');
}

/**
 * Gate an independent add-on. Active when the plan includes it OR it's been
 * purchased on the subscription. No package / non-new-model = allowed.
 */
export async function requireAddOn(
  tenant: TenantContext,
  addOn: AddOnKey,
): Promise<void> {
  const sub = tenant.subscription;
  const pkg = sub?.packageId ? await getPackageById(sub.packageId) : null;
  if (isAddOnActive(sub, pkg, addOn)) return;
  throw NextResponse.json(
    {
      error: `${ADDON_LABELS[addOn]} isn't part of your plan. Add it to enable it.`,
      addOn,
      code: 'ADDON_NOT_ACTIVE',
    },
    { status: 403 },
  );
}
