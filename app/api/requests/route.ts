import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { requirePermission } from '@/lib/permissions/require';
import { requestSchema } from '@/lib/validations/request.schema';
import * as requestsService from '@/lib/modules/requests/services/requests.service';

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'requests');
    requirePermission(tenant.user, 'requests', 'view');
    const user = tenant.user;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const type = searchParams.get('type') ?? undefined;
    const userId = user.role === 'staff' ? user.uid : undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined;
    const sortBy = searchParams.get('sortBy') ?? undefined;
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' as const : 'desc' as const;

    const requests = await requestsService.getAll(tenant, {
      status, type, userId, page, pageSize, sortBy: sortBy as never, sortDir,
    });
    return NextResponse.json(requests);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'requests');
    requirePermission(tenant.user, 'requests', 'create');

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const result = await requestsService.create(tenant, {
      type: data.type,
      assetId: data.assetId || undefined,
      warrantyId: data.warrantyId || undefined,
      inventoryItemId: data.inventoryItemId || undefined,
      description: data.description,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
