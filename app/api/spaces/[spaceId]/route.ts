import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as spacesService from '@/lib/modules/spaces/services/spaces.service';

/** PATCH /api/spaces/[spaceId] — rename or archive (admin/owner). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const tenant = await resolveTenant();
    const { spaceId } = await params;
    const body = await req.json().catch(() => ({}));
    const space = await spacesService.update(tenant, spaceId, {
      name: typeof body.name === 'string' ? body.name : undefined,
      status: body.status === 'active' || body.status === 'archived' ? body.status : undefined,
    });
    return NextResponse.json({ space });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PATCH /api/spaces/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
