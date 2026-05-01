import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getMaintenanceRecordById, deleteMaintenanceRecord } from '@/lib/db/maintenance-records';
import { writeAuditLog } from '@/lib/audit/logger';

export async function DELETE(_req: NextRequest, { params }: { params: { assetId: string; recordId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const record = await getMaintenanceRecordById(params.recordId);
    if (!record || record.organizationId !== user.organizationId || record.assetId !== params.assetId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteMaintenanceRecord(params.recordId);

    await writeAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
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
