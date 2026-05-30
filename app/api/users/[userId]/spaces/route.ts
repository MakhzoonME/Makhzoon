import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as userSpacesService from '@/lib/modules/spaces/services/user-spaces.service';

/** GET /api/users/[userId]/spaces → { allSpaces, spaceIds } (admin only) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const tenant = await resolveTenant();
    const { userId } = await params;
    const access = await userSpacesService.getUserSpaceAccess(tenant, userId);
    return NextResponse.json(access);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/users/[userId]/spaces]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/users/[userId]/spaces  body: { allSpaces, spaceIds } (admin only) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const tenant = await resolveTenant();
    const { userId } = await params;
    const body = await req.json().catch(() => ({}));

    if (typeof body.allSpaces !== 'boolean')
      return NextResponse.json({ error: 'allSpaces is required' }, { status: 422 });
    if (!Array.isArray(body.spaceIds))
      return NextResponse.json({ error: 'spaceIds must be an array' }, { status: 422 });

    await userSpacesService.setUserSpaceAccess(tenant, userId, {
      allSpaces: body.allSpaces,
      spaceIds: body.spaceIds.filter((s: unknown): s is string => typeof s === 'string'),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PATCH /api/users/[userId]/spaces]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
