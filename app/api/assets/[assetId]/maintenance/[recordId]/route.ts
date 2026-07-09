import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { requirePermission } from '@/lib/permissions/require';
import { getMaintenanceRecordById, deleteMaintenanceRecord } from '@/lib/db/maintenance-records';
import { auditLog } from '@/lib/platform/audit';

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ assetId: string; recordId: string }> }
) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'assets');
    const user = tenant.user;
    requirePermission(user, 'assets', 'maintenance');

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
