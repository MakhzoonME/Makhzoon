import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { requirePermission } from '@/lib/permissions/require';
import { updateAsset } from '@/lib/db/assets';
import * as requestsService from '@/lib/modules/requests/services/requests.service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'requests');
    requirePermission(tenant.user, 'requests', 'approve');
    const { requestId } = await params;

    const request = await requestsService.approve(tenant, requestId);

    if (request.type === 'RETIRE' && request.assetId) {
      await updateAsset(request.assetId, {
        status: 'Retired',
        updatedBy: tenant.user.uid,
        updatedByEmail: tenant.user.email,
        updatedByName: tenant.user.displayName,
        updatedByRole: tenant.user.role,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/requests/[requestId]/approve]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
