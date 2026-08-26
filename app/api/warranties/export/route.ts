import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { buildXlsx, xlsxResponse } from '@/lib/export/xlsx';
import { WARRANTY_COLUMNS, warrantiesToRows } from '@/lib/export/datasets';
import { exportWarrantiesToCSV } from '@/lib/export/csv';
import { format } from 'date-fns';
import * as warrantiesService from '@/lib/modules/warranties/services/warranties.service';

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'warranties');
    const user = tenant.user;
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const fmt = req.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
    const result = await warrantiesService.getAll(tenant);
    const items = result.items as never;
    const stamp = format(new Date(), 'yyyy-MM-dd');

    if (fmt === 'csv') {
      return new NextResponse(exportWarrantiesToCSV(items), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="warranties-${stamp}.csv"`,
        },
      });
    }

    const buffer = await buildXlsx('Warranties', WARRANTY_COLUMNS, warrantiesToRows(items));
    return xlsxResponse(buffer, `warranties-${stamp}.xlsx`);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/warranties/export]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
