import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { getOrganizationById } from '@/lib/db/organizations';
import { getUserById } from '@/lib/db/users';
import { getPackageById } from '@/lib/db/packages';
import { getActiveAddOns } from '@/lib/platform/entitlements';
import type { AddOnKey } from '@/types';

const EMPTY_ACTIVE_ADD_ONS: Record<AddOnKey, boolean> = {
  deliveryAgents: false,
  warrantyCerts: false,
  customization: false,
  purchasesRequests: false,
  vehicleIntake: false,
  documentReports: false,
};

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let features: Record<string, boolean> = {};
    let activeHarakaModules: string[] = [];
    let activeAddOns: Record<AddOnKey, boolean> = { ...EMPTY_ACTIVE_ADD_ONS };
    let orgSlug: string | null = null;
    let avatarUrl: string | null = null;

    const [sub, org, dbUser] = await Promise.all([
      user.organizationId ? getSubscriptionByOrg(user.organizationId) : Promise.resolve(null),
      user.organizationId ? getOrganizationById(user.organizationId) : Promise.resolve(null),
      getUserById(user.uid),
    ]);
    if (sub?.features) features = sub.features as Record<string, boolean>;
    if (sub) {
      activeHarakaModules = [
        ...(sub.activeHarakaModules ?? []),
        ...(sub.activeAddOns?.extraHarakaModules ?? []),
      ];
      const pkg = sub.packageId ? await getPackageById(sub.packageId) : null;
      activeAddOns = getActiveAddOns(sub, pkg);
    }
    orgSlug = org?.subdomain ?? null;
    avatarUrl = dbUser?.avatarUrl ?? null;
    const displayName = dbUser?.displayName ?? null;

    return NextResponse.json(
      {
        uid: user.uid,
        role: user.role,
        organizationId: user.organizationId,
        orgSlug,
        avatarUrl,
        displayName,
        permissions: user.permissions ?? null,
        saPermissions: user.saPermissions ?? null,
        features,
        activeHarakaModules,
        activeAddOns,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
