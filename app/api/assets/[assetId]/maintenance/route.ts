import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requirePermission } from '@/lib/permissions/require';
import { getAssetById } from '@/lib/db/assets';
import { getMaintenanceRecords, createMaintenanceRecord } from '@/lib/db/maintenance-records';
import { auditLog } from '@/lib/platform/audit';
import { maintenanceRecordSchema } from '@/lib/validations/maintenance-record.schema';

export async function GET(_req: NextRequest, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

    const asset = await getAssetById(params.assetId);
    if (!asset || asset.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const records = await getMaintenanceRecords(user.organizationId, params.assetId);
    return NextResponse.json(records);
  } catch (err) {
    console.error('[GET /api/assets/[assetId]/maintenance]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;
    requirePermission(user, 'assets', 'maintenance');

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
      spaceId: tenant.spaceId,
      assetId: params.assetId,
      type,
      description,
      performedBy: performedBy || undefined,
      cost: cost === '' || cost === undefined ? undefined : Number(cost),
      date: new Date(date),
      createdBy: user.uid,
      createdByEmail: user.email,
    });

    auditLog.queue({
      tenant,
      action: 'MAINTENANCE_ADDED',
      module: 'assets',
      recordId: params.assetId,
      newValue: { recordId: id, type, description, cost, date },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/assets/[assetId]/maintenance]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
