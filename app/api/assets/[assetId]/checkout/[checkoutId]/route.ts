import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getCheckoutById, markReturned } from '@/lib/db/asset-checkouts';
import { updateAsset } from '@/lib/db/assets';
import { queueAuditLog } from '@/lib/audit/logger';

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ assetId: string; checkoutId: string }> }) {
  try {
    const { assetId, checkoutId } = await params;
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const checkout = await getCheckoutById(checkoutId);
    if (!checkout || checkout.organizationId !== user.organizationId || checkout.assetId !== assetId) {
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

    queueAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
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
