import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { getAssetById } from '@/lib/db/assets';
import { getInventoryItemById } from '@/lib/db/inventory';
import { warrantySchema } from '@/lib/validations/warranty.schema';
import * as warrantiesService from '@/lib/modules/warranties/services/warranties.service';

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant();

    const { searchParams } = new URL(req.url);
    const expiringSoon = searchParams.get('expiringSoon') === 'true';

    if (expiringSoon) {
      const warranties = await warrantiesService.getExpiring(tenant, 30);
      return NextResponse.json(warranties);
    }

    const assetId = searchParams.get('assetId') ?? undefined;
    const inventoryItemId = searchParams.get('inventoryItemId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined;
    const sortBy = searchParams.get('sortBy') ?? undefined;
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' as const : 'desc' as const;

    const warranties = await warrantiesService.getAll(tenant, {
      assetId, inventoryItemId, status, page, pageSize, sortBy: sortBy as never, sortDir,
    });
    return NextResponse.json(warranties);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/warranties]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const orgId = tenant.organizationId;

    const body = await req.json();
    const parsed = warrantySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;

    if (data.assetId) {
      const asset = await getAssetById(data.assetId);
      if (!asset || asset.organizationId !== orgId) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      if (asset.status === 'Retired') return NextResponse.json({ error: 'Cannot attach warranty to a retired asset' }, { status: 422 });
    }

    if (data.inventoryItemId) {
      const item = await getInventoryItemById(data.inventoryItemId);
      if (!item || item.organizationId !== orgId) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const result = await warrantiesService.create(tenant, {
      assetId: data.assetId,
      inventoryItemId: data.inventoryItemId,
      vendor: data.vendor,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reminder: data.reminder,
      notes: data.notes || undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/warranties]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
