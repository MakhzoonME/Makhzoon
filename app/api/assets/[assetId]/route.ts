import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { assetSchema } from '@/lib/validations/asset.schema';
import * as assetsService from '@/lib/services/assets.service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { assetId } = await params;
    const asset = await assetsService.getOrgAsset(user, assetId);

    return NextResponse.json(asset, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Asset not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[GET /api/assets/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    await assetsService.updateAssetWithAudit(user, assetId, transformedData);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (message === 'Asset not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[PUT /api/assets/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { assetId } = await params;
    await assetsService.deleteAssetWithAudit(user, assetId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (message === 'Asset not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[DELETE /api/assets/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
