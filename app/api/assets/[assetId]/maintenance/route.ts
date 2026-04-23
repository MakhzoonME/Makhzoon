import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAssetById } from '@/lib/firestore/assets';
import { getMaintenanceRecords, createMaintenanceRecord } from '@/lib/firestore/maintenance-records';
import { writeAuditLog } from '@/lib/audit/logger';
import { maintenanceRecordSchema } from '@/lib/validations/maintenance-record.schema';

export async function GET(_req: NextRequest, { params }: { params: { assetId: string } }) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const asset = await getAssetById(params.assetId);
  if (!asset || asset.organizationId !== user.organizationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const records = await getMaintenanceRecords(user.organizationId, params.assetId);
  return NextResponse.json(records);
}

export async function POST(req: NextRequest, { params }: { params: { assetId: string } }) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const asset = await getAssetById(params.assetId);
  if (!asset || asset.organizationId !== user.organizationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = maintenanceRecordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { type, description, performedBy, cost, date } = parsed.data;
  const id = await createMaintenanceRecord({
    organizationId: user.organizationId,
    assetId: params.assetId,
    type,
    description,
    performedBy: performedBy || undefined,
    cost: cost === '' || cost === undefined ? undefined : Number(cost),
    date: new Date(date),
    createdBy: user.uid,
    createdByEmail: user.email,
  });

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.uid,
    role: user.role,
    action: 'MAINTENANCE_ADDED',
    module: 'assets',
    recordId: params.assetId,
    newValue: { recordId: id, type, description, cost, date },
  });

  return NextResponse.json({ id }, { status: 201 });
}
