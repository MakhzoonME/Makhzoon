import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { inventoryItemSchema } from '@/lib/validations/inventory.schema';
import { withLogging } from '@/lib/logging/with-logging';
import * as inventoryService from '@/lib/services/inventory.service';

interface Params { params: { itemId: string } }

async function _GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const item = await inventoryService.getOrgInventoryItem(user, params.itemId);
    return NextResponse.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Inventory item not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[GET /api/inventory/[itemId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = inventoryItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const transformedData = {
      ...data,
      reorderQuantity: data.reorderQuantity ? Number(data.reorderQuantity) : undefined,
      unitCost: data.unitCost ? Number(data.unitCost) : undefined,
    };
    await inventoryService.updateInventoryItemWithAudit(user, params.itemId, transformedData);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (message === 'Inventory item not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[PATCH /api/inventory/[itemId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await inventoryService.deleteInventoryItemWithAudit(user, params.itemId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (message === 'Inventory item not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[DELETE /api/inventory/[itemId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GET    = withLogging(_GET as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PATCH  = withLogging(_PATCH as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DELETE = withLogging(_DELETE as any);
