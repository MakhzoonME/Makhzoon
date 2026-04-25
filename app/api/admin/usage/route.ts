import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAllOrgsWithUsage } from '@/lib/firestore/usage';

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
