import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as moveService from '@/lib/modules/spaces/services/move.service';

type MoveType = 'asset' | 'inventory';

/**
 * POST /api/spaces/move
 * Body:
 *   {
 *     type: 'asset' | 'inventory',
 *     ids: string[],
 *     targetSpaceId: string
 *   }
 *
 * Resource types planned for follow-up: 'request', 'customer', and
 * 'inventory-transfer' (split quantity between two spaces via paired
 * ledger rows).
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const body = await req.json().catch(() => ({}));

    const type = body.type as MoveType | undefined;
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string') : [];
    const targetSpaceId = typeof body.targetSpaceId === 'string' ? body.targetSpaceId : '';

    if (!type || !['asset', 'inventory'].includes(type))
      return NextResponse.json({ error: 'Invalid type' }, { status: 422 });
    if (ids.length === 0)
      return NextResponse.json({ error: 'No ids provided' }, { status: 422 });
    if (!targetSpaceId)
      return NextResponse.json({ error: 'targetSpaceId required' }, { status: 422 });

    const result = type === 'asset'
      ? await moveService.moveAssets(tenant, ids, targetSpaceId)
      : await moveService.moveInventoryItems(tenant, ids, targetSpaceId);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/spaces/move]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
