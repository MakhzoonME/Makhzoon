import 'server-only';
import { NextResponse } from 'next/server';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { AddOnKey, HarakaModule } from '@/types';
import { HARAKA_MODULE_LABELS } from '@/types';
import { getPackageById } from '@/lib/db/packages';
import { ADDON_LABELS, isAddOnActive, isPricingModelPackage } from '@/lib/platform/entitlements';

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
 * Gate the staff directory strictly on the Workers add-on. Appointments no
 * longer falls back to this — when Workers is off, appointments must be
 * created without a staff provider (see createAppointmentSchema).
 */
export async function requireStaffAccess(tenant: TenantContext): Promise<void> {
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
