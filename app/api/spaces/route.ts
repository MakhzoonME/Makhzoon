import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import * as spacesService from '@/lib/modules/spaces/services/spaces.service';

/**
 * GET /api/spaces
 *   ?scope=accessible (default)  → only spaces the caller can navigate to
 *   ?scope=all                   → all org spaces, including archived (mgr only)
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const scope = new URL(req.url).searchParams.get('scope') ?? 'accessible';
    const items = scope === 'all'
      ? await spacesService.listAllForOrg(tenant)
      : await spacesService.listAccessible(tenant);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/spaces]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/spaces — create new space (admin/owner). */
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const body = await req.json().catch(() => ({}));
    const space = await spacesService.create(tenant, {
      name: typeof body.name === 'string' ? body.name : '',
      slug: typeof body.slug === 'string' ? body.slug : undefined,
    });
    return NextResponse.json({ space }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/spaces]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
