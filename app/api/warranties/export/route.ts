import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getWarranties } from '@/lib/firestore/warranties';
import { exportWarrantiesToCSV } from '@/lib/export/csv';
import { format } from 'date-fns';

export async function GET(_req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const orgId = user.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const warranties = await getWarranties(orgId);
  const csv = exportWarrantiesToCSV(warranties);
  const filename = `warranties-${format(new Date(), 'yyyy-MM-dd')}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
