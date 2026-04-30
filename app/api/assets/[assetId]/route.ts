import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAssetById, updateAsset, deleteAsset } from '@/lib/firestore/assets';
import { writeAuditLog } from '@/lib/audit/logger';
import { assetSchema } from '@/lib/validations/asset.schema';
import { hasPermission } from '@/lib/utils/permissions';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { assetId } = await params;
    const asset = await getAssetById(assetId);
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (asset.organizationId !== user.organizationId && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(asset, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[GET /api/assets/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'assets', 'update')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { assetId } = await params;
    const asset = await getAssetById(assetId);
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (asset.organizationId !== user.organizationId && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = assetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const updates = {
      name: data.name,
      category: data.category,
      status: data.status,
      serialNumber: data.serialNumber || undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : undefined,
      assignedTo: data.assignedTo || undefined,
      location: data.location || undefined,
      notes: data.notes || undefined,
      updatedBy: user.uid,
      updatedByEmail: user.email || undefined,
      updatedByName: user.displayName || undefined,
      updatedByRole: user.role || undefined,
    };

    await updateAsset(assetId, updates);
    await writeAuditLog({
      organizationId: asset.organizationId,
      userId: user.uid,
      role: user.role,
      action: data.status === 'Retired' && asset.status !== 'Retired' ? 'ASSET_RETIRED' : 'ASSET_UPDATED',
      module: 'assets',
      recordId: assetId,
      oldValue: { status: asset.status, name: asset.name },
      newValue: { status: data.status, name: data.name },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/assets/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'assets', 'delete')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { assetId } = await params;
    const asset = await getAssetById(assetId);
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (asset.status === 'Retired') {
      // Hard-delete already-retired assets
      await deleteAsset(assetId);
      await writeAuditLog({
        organizationId: asset.organizationId,
        userId: user.uid,
        role: user.role,
        action: 'ASSET_DELETED',
        module: 'assets',
        recordId: assetId,
        oldValue: { status: asset.status, name: asset.name },
        newValue: undefined,
      });
    } else {
      // Retire active assets
      await updateAsset(assetId, { status: 'Retired', updatedBy: user.uid });
      await writeAuditLog({
        organizationId: asset.organizationId,
        userId: user.uid,
        role: user.role,
        action: 'ASSET_RETIRED',
        module: 'assets',
        recordId: assetId,
        oldValue: { status: asset.status },
        newValue: { status: 'Retired' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/assets/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
