import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { hasSuperAdminPermission } from '@/lib/permissions/superadmin';
import { listTables } from '@/lib/db/admin-database';

/** List every public table (superadmin Database panel). Requires database:view. */
export async function GET(_req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasSuperAdminPermission(user, 'database', 'view'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tables = await listTables();
    return NextResponse.json({ tables }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/superadmin/database/tables]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
