import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAssets } from '@/lib/firestore/assets';
import { exportAssetsToCSV } from '@/lib/export/csv';
import { format } from 'date-fns';

export async function GET(_req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const { items: assets } = await getAssets(orgId, { limit: 1000 });
    const csv = exportAssetsToCSV(assets);
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
