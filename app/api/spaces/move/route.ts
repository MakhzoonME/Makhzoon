import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as moveService from '@/lib/modules/spaces/services/move.service';
import { z } from 'zod';

const moveSchema = z.object({
  type: z.enum(['asset', 'inventory', 'request', 'customer']),
  ids: z.array(z.string()).min(1),
  targetSpaceId: z.string().min(1),
  mode: z.enum(['move', 'transfer-qty']).optional(),
  qty: z.number().optional(),
});

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
    const parsed = moveSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const msg = issue?.path[0] === 'type' ? 'Invalid type'
        : issue?.path[0] === 'ids' ? 'No ids provided'
        : issue?.path[0] === 'targetSpaceId' ? 'targetSpaceId required'
        : 'Invalid body';
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    const type: MoveType = parsed.data.type;
    const ids = parsed.data.ids;
    const targetSpaceId = parsed.data.targetSpaceId;
    const mode: MoveMode = parsed.data.mode ?? 'move';
    const qty = parsed.data.qty;

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
