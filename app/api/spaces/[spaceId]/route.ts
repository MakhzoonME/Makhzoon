import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as spacesService from '@/lib/modules/spaces/services/spaces.service';
import { z } from 'zod';

const updateSpaceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

/** PATCH /api/spaces/[spaceId] — rename or archive (admin/owner). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const tenant = await resolveTenant();
    const { spaceId } = await params;
    const parsed = updateSpaceSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 422 });
    const space = await spacesService.update(tenant, spaceId, parsed.data);
    return NextResponse.json({ space });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PATCH /api/spaces/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
