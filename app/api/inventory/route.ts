import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getInventoryItems, createInventoryItem, getInventoryCategories } from '@/lib/firestore/inventory';
import { writeAuditLog } from '@/lib/audit/logger';
import { inventoryItemSchema } from '@/lib/validations/inventory.schema';
import { hasPermission } from '@/lib/permissions';
import { withLogging } from '@/lib/logging/with-logging';

async function _GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const { searchParams } = new URL(req.url);

    if (searchParams.get('categoriesOnly') === 'true') {
      const categories = await getInventoryCategories(orgId);
      return NextResponse.json({ categories });
    }

    const items = await getInventoryItems(orgId, {
      category: searchParams.get('category') ?? undefined,
      stockStatus: searchParams.get('stockStatus') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    });
    return NextResponse.json({ items }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[GET /api/inventory]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'inventory', 'create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json();
    const parsed = inventoryItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const id = await createInventoryItem({
      organizationId: orgId,
      name: data.name,
      category: data.category,
      sku: data.sku || undefined,
      unit: data.unit,
      quantityOnHand: data.quantityOnHand,
      minimumThreshold: data.minimumThreshold,
      reorderQuantity: data.reorderQuantity ? Number(data.reorderQuantity) : undefined,
      location: data.location || undefined,
      supplier: data.supplier || undefined,
      unitCost: data.unitCost ? Number(data.unitCost) : undefined,
      notes: data.notes || undefined,
      createdBy: user.uid,
      createdByEmail: user.email || undefined,
      createdByName: user.displayName || undefined,
      updatedBy: user.uid,
      updatedByEmail: user.email || undefined,
      updatedByName: user.displayName || undefined,
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'INVENTORY_ITEM_CREATED',
      module: 'inventory',
      recordId: id,
      newValue: { ...data },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/inventory]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET  = withLogging(_GET);
export const POST = withLogging(_POST);
