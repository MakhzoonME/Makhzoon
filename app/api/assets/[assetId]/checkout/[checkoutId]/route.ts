import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { getCheckoutById, markReturned } from '@/lib/db/asset-checkouts';
import { updateAsset } from '@/lib/db/assets';
import { auditLog } from '@/lib/platform/audit';

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ assetId: string; checkoutId: string }> }) {
  try {
    const { assetId, checkoutId } = await params;
    const tenant = await resolveTenant();
    const user = tenant.user;

    const checkout = await getCheckoutById(checkoutId);
    if (!checkout || checkout.organizationId !== tenant.organizationId || checkout.assetId !== assetId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (checkout.returnedAt) {
      return NextResponse.json({ error: 'Already returned' }, { status: 400 });
    }

    await markReturned(checkoutId, {
      returnedBy: user.uid,
      returnedByEmail: user.email,
    });

    await updateAsset(assetId, { assignedTo: '', updatedBy: user.uid });

    auditLog.queue({
      tenant,
      action: 'ASSET_CHECKED_IN',
      module: 'assets',
      recordId: assetId,
      oldValue: { checkoutId: checkoutId, checkedOutTo: checkout.checkedOutTo },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/assets/[assetId]/checkout/[checkoutId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
