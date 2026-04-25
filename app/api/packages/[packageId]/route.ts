import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getPackageById, updatePackage, deletePackage } from '@/lib/firestore/packages';
import { writeAuditLog } from '@/lib/audit/logger';
import { packageUpdateSchema } from '@/lib/validations/package.schema';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ packageId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { packageId } = await params;
    const pkg = await getPackageById(packageId);
    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(pkg);
  } catch (err) {
    console.error('[GET /api/packages/[packageId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ packageId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { packageId } = await params;
    const existing = await getPackageById(packageId);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const parsed = packageUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    await updatePackage(packageId, user.uid, parsed.data);

    await writeAuditLog({
      organizationId: '',
      userId: user.uid,
      role: user.role,
      action: 'PACKAGE_UPDATED',
      module: 'packages',
      recordId: packageId,
      oldValue: { name: existing.name, isActive: existing.isActive },
      newValue: parsed.data,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/packages/[packageId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ packageId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { packageId } = await params;
    const existing = await getPackageById(packageId);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deletePackage(packageId, user.uid);

    await writeAuditLog({
      organizationId: '',
      userId: user.uid,
      role: user.role,
      action: 'PACKAGE_DELETED',
      module: 'packages',
      recordId: packageId,
      oldValue: { name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/packages/[packageId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
