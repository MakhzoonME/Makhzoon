import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { getAssets } from '@/lib/db/assets';
import { exportAssetsToCSV } from '@/lib/export/csv';
import { format } from 'date-fns';

export async function GET(_req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'assets');
    const user = tenant.user;
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = tenant.organizationId;

    // Paginate through ALL assets to avoid the 1000-row cap
    const allAssets: Awaited<ReturnType<typeof getAssets>>['items'] = [];
    let page = 1;
    const pageSize = 500;
    while (true) {
      const { items, totalPages } = await getAssets(orgId, { page, pageSize });
      allAssets.push(...items);
      if (page >= totalPages) break;
      page++;
    }
    const csv = exportAssetsToCSV(allAssets);
    const filename = `assets-${format(new Date(), 'yyyy-MM-dd')}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/assets/export]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
