import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAssetById, updateAsset } from '@/lib/firestore/assets';
import { getCheckouts, getActiveCheckoutForAsset, createCheckout } from '@/lib/firestore/asset-checkouts';
import { writeAuditLog } from '@/lib/audit/logger';
import { checkoutSchema } from '@/lib/validations/asset-checkout.schema';

export async function GET(_req: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const asset = await getAssetById(params.assetId);
    if (!asset || asset.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const checkouts = await getCheckouts(user.organizationId, { assetId: params.assetId });
    return NextResponse.json(checkouts);
  } catch (err) {
    console.error('[GET /api/assets/[assetId]/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const asset = await getAssetById(params.assetId);
    if (!asset || asset.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (asset.status !== 'Active') {
      return NextResponse.json({ error: 'Retired assets cannot be checked out' }, { status: 400 });
    }

    const existing = await getActiveCheckoutForAsset(user.organizationId, params.assetId);
    if (existing) {
      return NextResponse.json({ error: 'Asset is already checked out. Return it first.' }, { status: 409 });
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { checkedOutTo, dueDate, notes } = parsed.data;

    const id = await createCheckout({
      organizationId: user.organizationId,
      assetId: params.assetId,
      checkedOutTo: checkedOutTo.trim(),
      checkedOutBy: user.uid,
      checkedOutByEmail: user.email,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: notes?.trim() || undefined,
    });

    await updateAsset(params.assetId, { assignedTo: checkedOutTo.trim(), updatedBy: user.uid });

    await writeAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'ASSET_CHECKED_OUT',
      module: 'assets',
      recordId: params.assetId,
      newValue: { checkoutId: id, checkedOutTo, dueDate },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/assets/[assetId]/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
