import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import * as requestsService from '@/lib/modules/requests/services/requests.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;
    const tenant = await resolveTenant();
    requireFeature(tenant, 'requests');
    const request = await requestsService.getById(tenant, requestId);
    return NextResponse.json(request);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/requests/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
