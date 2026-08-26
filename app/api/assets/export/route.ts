import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { getAssets } from '@/lib/db/assets';
import { buildXlsx, xlsxResponse } from '@/lib/export/xlsx';
import { ASSET_COLUMNS, assetsToRows } from '@/lib/export/datasets';
import { exportAssetsToCSV } from '@/lib/export/csv';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'assets');
    const user = tenant.user;
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = tenant.organizationId;
    const sp = req.nextUrl.searchParams;
    const fmt = sp.get('format') === 'csv' ? 'csv' : 'xlsx';
    // "Export" passes the page filters (or, with no filters, the visible
    // page via page/pageSize); "Export All" passes none of these.
    const filters = {
      status: sp.get('status') ?? undefined,
      category: sp.get('category') ?? undefined,
      search: sp.get('search') ?? undefined,
      sortBy: (sp.get('sortBy') as never) ?? undefined,
      sortDir: sp.get('sortDir') === 'asc' ? ('asc' as const) : sp.get('sortDir') === 'desc' ? ('desc' as const) : undefined,
    };
    const onlyPage = sp.get('page') ? parseInt(sp.get('page')!, 10) : undefined;
    const onlyPageSize = sp.get('pageSize') ? parseInt(sp.get('pageSize')!, 10) : undefined;

    const allAssets: Awaited<ReturnType<typeof getAssets>>['items'] = [];
    if (onlyPage) {
      // Export exactly what's visible on screen (one page).
      const { items } = await getAssets(orgId, { page: onlyPage, pageSize: onlyPageSize ?? 10, ...filters });
      allAssets.push(...items);
    } else {
      // Paginate through ALL matching assets (no 1000-row cap).
      let page = 1;
      const pageSize = 500;
      while (true) {
        const { items, totalPages } = await getAssets(orgId, { page, pageSize, ...filters });
        allAssets.push(...items);
        if (page >= totalPages || items.length === 0) break;
        page++;
      }
    }

    const stamp = format(new Date(), 'yyyy-MM-dd');
    if (fmt === 'csv') {
      return new NextResponse(exportAssetsToCSV(allAssets), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="assets-${stamp}.csv"`,
        },
      });
    }

    const buffer = await buildXlsx('Assets', ASSET_COLUMNS, assetsToRows(allAssets));
    return xlsxResponse(buffer, `assets-${stamp}.xlsx`);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/assets/export]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
