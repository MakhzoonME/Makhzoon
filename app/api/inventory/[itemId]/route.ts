import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getInventoryItemById, updateInventoryItem, deleteInventoryItem } from '@/lib/firestore/inventory';
import { writeAuditLog } from '@/lib/audit/logger';
import { inventoryItemSchema } from '@/lib/validations/inventory.schema';

interface Params { params: { itemId: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const item = await getInventoryItemById(params.itemId);
    if (!item || item.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (err) {
    console.error('[GET /api/inventory/[itemId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const item = await getInventoryItemById(params.itemId);
    if (!item || item.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const parsed = inventoryItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    await updateInventoryItem(params.itemId, {
      ...data,
      reorderQuantity: data.reorderQuantity ? Number(data.reorderQuantity) : undefined,
      unitCost: data.unitCost ? Number(data.unitCost) : undefined,
      updatedBy: user.uid,
      updatedByEmail: user.email || undefined,
      updatedByName: user.displayName || undefined,
    });

    await writeAuditLog({
      organizationId: user.organizationId!,
      userId: user.uid,
      role: user.role,
      action: 'INVENTORY_ITEM_UPDATED',
      module: 'inventory',
      recordId: params.itemId,
      oldValue: { name: item.name, quantityOnHand: item.quantityOnHand },
      newValue: { ...data },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/inventory/[itemId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const item = await getInventoryItemById(params.itemId);
    if (!item || item.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteInventoryItem(params.itemId);

    await writeAuditLog({
      organizationId: user.organizationId!,
      userId: user.uid,
      role: user.role,
      action: 'INVENTORY_ITEM_DELETED',
      module: 'inventory',
      recordId: params.itemId,
      oldValue: { name: item.name },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/inventory/[itemId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
