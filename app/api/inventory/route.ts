import { NextRequest, NextResponse } from 'next/server';
import { inventoryItemSchema } from '@/lib/validations/inventory.schema';
import { withLogging } from '@/lib/logging/with-logging';
import { requireAuth } from '@/lib/services/base.service';
import * as inventoryService from '@/lib/services/inventory.service';

async function _GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    if (searchParams.get('categoriesOnly') === 'true') {
      const categories = await inventoryService.getOrgInventoryCategories(user);
      return NextResponse.json({ categories });
    }

    const items = await inventoryService.getOrgInventoryItems(user, {
      category: searchParams.get('category') ?? undefined,
      stockStatus: searchParams.get('stockStatus') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortDir: searchParams.get('sortDir') === 'asc' ? 'asc' as const : 'desc' as const,
    });
    return NextResponse.json(items, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/inventory]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const parsed = inventoryItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const result = await inventoryService.createInventoryItemWithAudit(user, {
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
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/inventory]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET  = withLogging(_GET);
export const POST = withLogging(_POST);
