import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getPackages, createPackage } from '@/lib/db/packages';
import { queueAuditLog } from '@/lib/audit/logger';
import { packageSchema } from '@/lib/validations/package.schema';

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const includeInactive =
      user.role === 'super_admin' && searchParams.get('includeInactive') === 'true';
    const packages = await getPackages({ includeInactive });
    return NextResponse.json(packages);
  } catch (err) {
    console.error('[GET /api/packages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = packageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const pkg = await createPackage(user.uid, parsed.data);

    queueAuditLog({
      organizationId: '',
      userId: user.uid,
      role: user.role,
      action: 'PACKAGE_CREATED',
      module: 'packages',
      recordId: pkg.id,
      newValue: { name: pkg.name },
    });

    return NextResponse.json(pkg, { status: 201 });
  } catch (err) {
    console.error('[POST /api/packages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
