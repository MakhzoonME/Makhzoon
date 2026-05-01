import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getWarranties, createWarranty, getExpiringWarranties } from '@/lib/db/warranties';
import { getAssetById } from '@/lib/db/assets';
import { queueAuditLog } from '@/lib/audit/logger';
import { warrantySchema } from '@/lib/validations/warranty.schema';
import { hasPermission } from '@/lib/permissions';
import { requireActiveSubscription } from '@/lib/services/base.service';

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const expiringSoon = searchParams.get('expiringSoon') === 'true';
    const assetId = searchParams.get('assetId') ?? undefined;

    if (expiringSoon) {
      const warranties = await getExpiringWarranties(orgId, 30);
      return NextResponse.json(warranties);
    }

    const warranties = await getWarranties(orgId, { assetId });
    return NextResponse.json(warranties);
  } catch (err) {
    console.error('[GET /api/warranties]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'warranties', 'create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    await requireActiveSubscription(orgId, user);

    const body = await req.json();
    const parsed = warrantySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const asset = await getAssetById(data.assetId);
    if (!asset || asset.organizationId !== orgId) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    if (asset.status === 'Retired') return NextResponse.json({ error: 'Cannot attach warranty to a retired asset' }, { status: 422 });

    const id = await createWarranty({
      organizationId: orgId,
      assetId: data.assetId,
      vendor: data.vendor,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reminder: data.reminder,
      notes: data.notes || undefined,
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'WARRANTY_CREATED',
      module: 'warranties',
      recordId: id,
      newValue: { ...data },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/warranties]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
