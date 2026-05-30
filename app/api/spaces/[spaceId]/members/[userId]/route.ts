import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as spacesService from '@/lib/modules/spaces/services/spaces.service';

/** DELETE /api/spaces/[spaceId]/members/[userId] — remove member (admin/owner). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string }> },
) {
  try {
    const tenant = await resolveTenant();
    const { spaceId, userId } = await params;
    await spacesService.removeMember(tenant, spaceId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[DELETE /api/spaces/[id]/members/[userId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
