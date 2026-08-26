import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { requirePermission } from '@/lib/permissions/require';
import { getActiveWarrantyIds } from '@/lib/db/warranties';

/**
 * Lightweight endpoint that returns just the IDs of assets and inventory items
 * that have at least one active (non-expired) warranty.  Used by WarrantyForm
 * to determine which items are eligible for a NEW warranty without loading all
 * warranty objects.
 */
export async function GET(_req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'warranties');
    requirePermission(tenant.user, 'usool', 'warrantiesView');

    const ids = await getActiveWarrantyIds(tenant.organizationId, tenant.spaceId);
    return NextResponse.json(ids);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/warranties/active-ids]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
