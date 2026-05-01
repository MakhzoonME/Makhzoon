import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getWarrantyById, updateWarranty, deleteWarranty } from '@/lib/firestore/warranties';
import { writeAuditLog, queueAuditLog } from '@/lib/audit/logger';
import { warrantySchema } from '@/lib/validations/warranty.schema';
import { hasPermission } from '@/lib/permissions';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ warrantyId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { warrantyId } = await params;
    const warranty = await getWarrantyById(warrantyId);
    if (!warranty) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(warranty);
  } catch (err) {
    console.error('[GET /api/warranties/[warrantyId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ warrantyId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'warranties', 'update')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { warrantyId } = await params;
    const existing = await getWarrantyById(warrantyId);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const parsed = warrantySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    await updateWarranty(warrantyId, {
      vendor: data.vendor,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reminder: data.reminder,
      notes: data.notes || undefined,
      updatedBy: user.uid,
    });

    await writeAuditLog({
      organizationId: existing.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'WARRANTY_UPDATED',
      module: 'warranties',
      recordId: warrantyId,
      oldValue: { vendor: existing.vendor, endDate: existing.endDate },
      newValue: { vendor: data.vendor, endDate: data.endDate },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/warranties/[warrantyId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ warrantyId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'warranties', 'delete')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { warrantyId } = await params;
    const existing = await getWarrantyById(warrantyId);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteWarranty(warrantyId);
    queueAuditLog({
      organizationId: existing.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'WARRANTY_DELETED',
      module: 'warranties',
      recordId: warrantyId,
      oldValue: { vendor: existing.vendor },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/warranties/[warrantyId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
