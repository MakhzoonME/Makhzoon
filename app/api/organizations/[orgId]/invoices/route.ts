import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getInvoicesByOrg } from '@/lib/db/invoices';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orgId } = await params;
    if (!SUPERADMIN_ROLES.has(user.role) && user.organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invoices = await getInvoicesByOrg(orgId);
    return NextResponse.json(invoices, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/organizations/[orgId]/invoices]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
