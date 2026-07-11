import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as duplicateService from '@/lib/modules/spaces/services/duplicate.service';
import { z } from 'zod';

const duplicateSchema = z.object({
  type: z.enum(['asset', 'inventory', 'request', 'customer']),
  ids: z.array(z.string()).min(1),
  targetSpaceId: z.string().min(1),
});

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
    const parsed = duplicateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const msg = issue?.path[0] === 'type' ? 'Invalid type'
        : issue?.path[0] === 'ids' ? 'No ids provided'
        : issue?.path[0] === 'targetSpaceId' ? 'targetSpaceId required'
        : 'Invalid body';
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    const type: DupeType = parsed.data.type;
    const ids = parsed.data.ids;
    const targetSpaceId = parsed.data.targetSpaceId;

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
