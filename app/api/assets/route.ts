import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAssets, createAsset, getAssetCategories } from '@/lib/firestore/assets';
import { getSubscriptionByOrg } from '@/lib/firestore/subscriptions';
import { writeAuditLog } from '@/lib/audit/logger';
import { assetSchema } from '@/lib/validations/asset.schema';

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const { searchParams } = new URL(req.url);

    if (searchParams.get('categoriesOnly') === 'true') {
      const categories = await getAssetCategories(orgId);
      return NextResponse.json({ categories }, {
        headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
      });
    }

    const status = searchParams.get('status') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const cursor = searchParams.get('cursor') ?? undefined;

    const result = await getAssets(orgId, { status, category, search, cursor });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[GET /api/assets]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const sub = await getSubscriptionByOrg(orgId);
    if (sub && sub.status !== 'ACTIVE') return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });

    const body = await req.json();
    const parsed = assetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const id = await createAsset({
      organizationId: orgId,
      name: data.name,
      category: data.category,
      status: data.status,
      serialNumber: data.serialNumber || undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : undefined,
      assignedTo: data.assignedTo || undefined,
      location: data.location || undefined,
      notes: data.notes || undefined,
      createdBy: user.uid,
      createdByEmail: user.email || undefined,
      createdByName: user.displayName || undefined,
      createdByRole: user.role || undefined,
      updatedBy: user.uid,
      updatedByEmail: user.email || undefined,
      updatedByName: user.displayName || undefined,
      updatedByRole: user.role || undefined,
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'ASSET_CREATED',
      module: 'assets',
      recordId: id,
      newValue: { ...data },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/assets]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
