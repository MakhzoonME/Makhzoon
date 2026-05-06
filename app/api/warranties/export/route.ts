import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { exportWarrantiesToCSV } from '@/lib/export/csv';
import { format } from 'date-fns';
import * as warrantiesService from '@/lib/modules/warranties/services/warranties.service';

export async function GET(_req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const result = await warrantiesService.getAll(tenant);
    const csv = exportWarrantiesToCSV(result.items as never);
    const filename = `warranties-${format(new Date(), 'yyyy-MM-dd')}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/warranties/export]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
