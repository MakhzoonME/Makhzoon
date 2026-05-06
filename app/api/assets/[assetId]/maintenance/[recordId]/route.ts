import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { getMaintenanceRecordById, deleteMaintenanceRecord } from '@/lib/db/maintenance-records';
import { auditLog } from '@/lib/platform/audit';

export async function DELETE(_req: NextRequest, { params }: { params: { assetId: string; recordId: string } }) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const record = await getMaintenanceRecordById(params.recordId);
    if (!record || record.organizationId !== tenant.organizationId || record.assetId !== params.assetId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteMaintenanceRecord(params.recordId);

    auditLog.queue({
      tenant,
      action: 'MAINTENANCE_DELETED',
      module: 'assets',
      recordId: params.assetId,
      oldValue: { recordId: params.recordId, type: record.type, description: record.description },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/assets/[assetId]/maintenance/[recordId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
