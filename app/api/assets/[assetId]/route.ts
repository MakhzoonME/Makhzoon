import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { requirePermission } from '@/lib/permissions/require';
import { assetSchema } from '@/lib/validations/asset.schema';
import * as assetsService from '@/lib/services/assets.service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'assets');
    const user = tenant.user;

    const { assetId } = await params;
    const asset = await assetsService.getOrgAsset(user, assetId);

    return NextResponse.json(asset, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : '';
    if (message === 'Asset not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[GET /api/assets/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'assets');
    const user = tenant.user;
    requirePermission(user, 'assets', 'update');

    const { assetId } = await params;
    const body = await req.json();
    const parsed = assetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const transformedData = {
      ...data,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : undefined,
    };
    await assetsService.updateAssetWithAudit(user, assetId, transformedData, tenant.spaceId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (message === 'Asset not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[PUT /api/assets/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'assets');
    const user = tenant.user;
    requirePermission(user, 'assets', 'delete');

    const { assetId } = await params;
    await assetsService.deleteAssetWithAudit(user, assetId, tenant.spaceId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (message === 'Asset not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[DELETE /api/assets/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
