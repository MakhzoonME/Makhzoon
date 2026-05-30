import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as duplicateService from '@/lib/modules/spaces/services/duplicate.service';

type DupeType = 'asset' | 'inventory' | 'request' | 'customer';

/**
 * POST /api/spaces/duplicate
 * Body:
 *   {
 *     type: 'asset' | 'inventory' | 'request' | 'customer',
 *     ids: string[],
 *     targetSpaceId: string
 *   }
 *
 * Creates copies of the given records in the target space. The
 * originals remain untouched in their source space. Per-type rules
 * (see service for details) — notably, inventory duplicates start at
 * quantity 0 and request duplicates require the referenced asset/item
 * to already exist in the target.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const body = await req.json().catch(() => ({}));

    const type = body.type as DupeType | undefined;
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string') : [];
    const targetSpaceId = typeof body.targetSpaceId === 'string' ? body.targetSpaceId : '';

    if (!type || !['asset', 'inventory', 'request', 'customer'].includes(type))
      return NextResponse.json({ error: 'Invalid type' }, { status: 422 });
    if (ids.length === 0)
      return NextResponse.json({ error: 'No ids provided' }, { status: 422 });
    if (!targetSpaceId)
      return NextResponse.json({ error: 'targetSpaceId required' }, { status: 422 });

    let result;
    switch (type) {
      case 'asset':
        result = await duplicateService.duplicateAssets(tenant, ids, targetSpaceId);
        break;
      case 'inventory':
        result = await duplicateService.duplicateInventoryItems(tenant, ids, targetSpaceId);
        break;
      case 'request':
        result = await duplicateService.duplicateRequests(tenant, ids, targetSpaceId);
        break;
      case 'customer':
        result = await duplicateService.duplicateCustomers(tenant, ids, targetSpaceId);
        break;
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/spaces/duplicate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
