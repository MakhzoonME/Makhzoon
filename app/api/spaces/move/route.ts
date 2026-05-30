import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as moveService from '@/lib/modules/spaces/services/move.service';

type MoveType = 'asset' | 'inventory' | 'request' | 'customer';
type MoveMode = 'move' | 'transfer-qty';

/**
 * POST /api/spaces/move
 * Body:
 *   {
 *     type: 'asset' | 'inventory',
 *     ids: string[],
 *     targetSpaceId: string,
 *     mode?: 'move' | 'transfer-qty',   // inventory only; 'move' by default
 *     qty?: number                       // required when mode='transfer-qty'
 *   }
 *
 * mode='move' (default) → whole-record move, dependents cascade.
 * mode='transfer-qty'   → keeps the source item in place, writes a
 *                         paired 'out'/'in' ledger between source and
 *                         target spaces (warehouse transfer). Inventory
 *                         only, single-item only.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const body = await req.json().catch(() => ({}));

    const type = body.type as MoveType | undefined;
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string') : [];
    const targetSpaceId = typeof body.targetSpaceId === 'string' ? body.targetSpaceId : '';
    const mode = (body.mode as MoveMode | undefined) ?? 'move';
    const qty = typeof body.qty === 'number' ? body.qty : undefined;

    if (!type || !['asset', 'inventory', 'request', 'customer'].includes(type))
      return NextResponse.json({ error: 'Invalid type' }, { status: 422 });
    if (ids.length === 0)
      return NextResponse.json({ error: 'No ids provided' }, { status: 422 });
    if (!targetSpaceId)
      return NextResponse.json({ error: 'targetSpaceId required' }, { status: 422 });

    if (mode === 'transfer-qty') {
      if (type !== 'inventory')
        return NextResponse.json({ error: 'transfer-qty mode is only valid for inventory' }, { status: 422 });
      if (ids.length !== 1)
        return NextResponse.json({ error: 'transfer-qty must target exactly one item' }, { status: 422 });
      if (qty === undefined || qty <= 0)
        return NextResponse.json({ error: 'qty is required and must be positive' }, { status: 422 });
      const result = await moveService.transferInventoryQuantity(tenant, ids[0], targetSpaceId, qty);
      return NextResponse.json({ ok: true, mode, ...result });
    }

    // Default whole-move path — dispatch by type.
    let result;
    switch (type) {
      case 'asset':
        result = await moveService.moveAssets(tenant, ids, targetSpaceId);
        break;
      case 'inventory':
        result = await moveService.moveInventoryItems(tenant, ids, targetSpaceId);
        break;
      case 'request':
        result = await moveService.moveRequests(tenant, ids, targetSpaceId);
        break;
      case 'customer':
        result = await moveService.moveCustomers(tenant, ids, targetSpaceId);
        break;
    }
    return NextResponse.json({ ok: true, mode: 'move', ...result });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/spaces/move]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
