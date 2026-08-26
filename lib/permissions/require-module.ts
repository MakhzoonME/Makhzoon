import 'server-only';
import { NextResponse } from 'next/server';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { AddOnKey, HarakaModule } from '@/types';
import { HARAKA_MODULE_LABELS } from '@/types';
import { getPackageById } from '@/lib/db/packages';
import { ADDON_LABELS, isAddOnActive, isPricingModelPackage } from '@/lib/platform/entitlements';
import { VERTICALS } from '@/lib/platform/verticals';

/**
 * Haraka sub-modules that the Zeyara vertical inherently includes. Service
 * JOBS and service VEHICLES are deliberately absent — those are Haraka-only
 * surfaces a clinic never buys, and they must keep the strict slot check.
 */
const ZEYARA_IMPLIED_MODULES = new Set<HarakaModule>(['appointments', 'services']);

export { getActiveAddOns, isAddOnActive } from '@/lib/platform/entitlements';

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
  // Zeyara implies the modules its surface is built on. Appointments and the
  // service catalog are sold à la carte INSIDE Haraka, but a clinic bought
  // them as part of the vertical — re-checking the Haraka slot list here would
  // 403 a Zeyara-only org out of its own product.
  // See docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §3.
  if (
    ZEYARA_IMPLIED_MODULES.has(module) &&
    sub?.features?.[VERTICALS.zeyara.featureKey]
  ) {
    return;
  }
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

/**
 * Gate the staff directory on the Workers add-on — with one exception.
 *
 * For Haraka, "Workers" are delivery agents: an optional extra, so appointments
 * fall back to being created without a staff provider when it is off (see
 * createAppointmentSchema).
 *
 * For Zeyara, the same table holds the clinic's PROVIDERS — the practitioners
 * whose calendars are the entire product. A clinic that bought the vertical has
 * already paid for them, so holding `zeyara` satisfies this gate outright.
 * See docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §3.
 */
export async function requireStaffAccess(tenant: TenantContext): Promise<void> {
  if (tenant.subscription?.features?.[VERTICALS.zeyara.featureKey]) return;
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
