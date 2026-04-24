import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getCheckoutById, markReturned } from '@/lib/firestore/asset-checkouts';
import { updateAsset } from '@/lib/firestore/assets';
import { writeAuditLog } from '@/lib/audit/logger';

export async function PATCH(_req: NextRequest, { params }: { params: { assetId: string; checkoutId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const checkout = await getCheckoutById(params.checkoutId);
    if (!checkout || checkout.organizationId !== user.organizationId || checkout.assetId !== params.assetId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (checkout.returnedAt) {
      return NextResponse.json({ error: 'Already returned' }, { status: 400 });
    }

    await markReturned(params.checkoutId, {
      returnedBy: user.uid,
      returnedByEmail: user.email,
    });

    await updateAsset(params.assetId, { assignedTo: '', updatedBy: user.uid });

    await writeAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'ASSET_CHECKED_IN',
      module: 'assets',
      recordId: params.assetId,
      oldValue: { checkoutId: params.checkoutId, checkedOutTo: checkout.checkedOutTo },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/assets/[assetId]/checkout/[checkoutId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
