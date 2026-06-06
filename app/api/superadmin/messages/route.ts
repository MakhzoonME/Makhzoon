import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getContactSalesEntries, deleteContactSalesEntry } from '@/lib/db/contact-sales';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const entries = await getContactSalesEntries();
    return NextResponse.json(entries);
  } catch (err) {
    console.error('[GET /api/superadmin/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await req.json().catch(() => ({})) as { id?: string };
    if (!id || typeof id !== 'string') return NextResponse.json({ error: 'id is required' }, { status: 422 });

    await deleteContactSalesEntry(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/superadmin/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
