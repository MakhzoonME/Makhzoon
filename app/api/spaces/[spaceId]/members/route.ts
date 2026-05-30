import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as spacesService from '@/lib/modules/spaces/services/spaces.service';

/** GET /api/spaces/[spaceId]/members — list members (admin/owner). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const tenant = await resolveTenant();
    const { spaceId } = await params;
    const items = await spacesService.listMembers(tenant, spaceId);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/spaces/[id]/members]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/spaces/[spaceId]/members  body: { userId }  (admin/owner). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const tenant = await resolveTenant();
    const { spaceId } = await params;
    const body = await req.json().catch(() => ({}));
    if (typeof body.userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 422 });
    }
    await spacesService.addMember(tenant, spaceId, body.userId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/spaces/[id]/members]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
