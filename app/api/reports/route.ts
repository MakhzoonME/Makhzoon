import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { rateLimitTenant } from '@/lib/rate-limit';
import { requirePermission } from '@/lib/permissions/require';
import * as reportsService from '@/lib/modules/reports/services/reports.service';

export async function GET() {
  try {
    const tenant = await resolveTenant();
    requirePermission(tenant.user, 'reports', 'view');
    const limited = rateLimitTenant(tenant, 'reports', 30, 60_000);
    if (limited) return limited;
    const data = await reportsService.getAll(tenant);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/reports]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
