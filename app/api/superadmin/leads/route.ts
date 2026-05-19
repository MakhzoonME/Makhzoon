import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getEarlyAccessEntries } from '@/lib/db/early-access';
import { getContactSalesEntries } from '@/lib/db/contact-sales';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const type = req.nextUrl.searchParams.get('type');

    if (type === 'early-access') {
      const entries = await getEarlyAccessEntries();
      return NextResponse.json(entries);
    }

    if (type === 'contact-sales') {
      const entries = await getContactSalesEntries();
      return NextResponse.json(entries);
    }

    const [earlyAccess, contactSales] = await Promise.all([
      getEarlyAccessEntries(),
      getContactSalesEntries(),
    ]);

    return NextResponse.json({ earlyAccess, contactSales });
  } catch (err) {
    console.error('[GET /api/superadmin/leads]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
