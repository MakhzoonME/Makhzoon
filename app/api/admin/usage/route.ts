import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { getAllOrgsWithUsage } from '@/lib/db/usage';

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const category = searchParams.get('category') ?? undefined;

    const data = await getAllOrgsWithUsage({ search, category });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/admin/usage]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
