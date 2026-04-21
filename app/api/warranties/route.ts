import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getWarranties, createWarranty, getExpiringWarranties } from '@/lib/firestore/warranties';
import { getAssetById } from '@/lib/firestore/assets';
import { getSubscriptionByOrg } from '@/lib/firestore/subscriptions';
import { writeAuditLog } from '@/lib/audit/logger';
import { warrantySchema } from '@/lib/validations/warranty.schema';

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const orgId = user.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const sub = await getSubscriptionByOrg(orgId);
  if (sub && sub.status !== 'ACTIVE') return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });

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

  await writeAuditLog({
    organizationId: orgId,
    userId: user.uid,
    role: user.role,
    action: 'WARRANTY_CREATED',
    module: 'warranties',
    recordId: id,
    newValue: { ...data },
  });

  return NextResponse.json({ id }, { status: 201 });
}
