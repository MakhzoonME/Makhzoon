import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { rateLimitTenant } from '@/lib/rate-limit';
import { requirePermission } from '@/lib/permissions/require';
import { BannaService } from '@/lib/modules/banna/services/banna.service';
import { createCustomFieldSchema } from '@/lib/modules/banna/validators/schemas';

const service = new BannaService();

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const { searchParams } = new URL(req.url);
    const moduleFilter = searchParams.get('module') as 'assets' | 'inventory' | 'requests' | 'customers' | undefined;

    // Customer custom fields ship ahead of the rest of Banna (which isn't
    // released — no org has the 'banna' feature flag yet) and ride on the
    // 'pos' feature instead, since that's what's actually live.
    requireFeature(tenant, moduleFilter === 'customers' ? 'pos' : 'banna');
    const limited = await rateLimitTenant(tenant, 'banna', 60, 60_000);
    if (limited) return limited;

    const fields = await service.getCustomFields(tenant, moduleFilter ? { module: moduleFilter } : undefined);
    return NextResponse.json({ items: fields });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/banna/custom-fields]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const parsed = createCustomFieldSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // See GET: customer fields aren't gated behind the (not-yet-live) 'banna'
    // feature — they ride on 'pos' instead.
    requireFeature(tenant, parsed.data.module === 'customers' ? 'pos' : 'banna');
    requirePermission(tenant.user, 'banna', 'create');
    return NextResponse.json(await service.createCustomField(tenant, parsed.data), { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/banna/custom-fields]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
