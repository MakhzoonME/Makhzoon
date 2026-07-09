import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { requirePermission } from '@/lib/permissions/require';
import { getInventoryAuditById, getAuditItems, completeAudit } from '@/lib/db/inventory-audits';
import { auditLog } from '@/lib/platform/audit';

interface Params { params: Promise<{ auditId: string }> }

export async function GET(_req: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'inventory');

    const audit = await getInventoryAuditById(params.auditId);
    if (!audit || audit.organizationId !== tenant.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const items = await getAuditItems(params.auditId);
    return NextResponse.json({ audit, items });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/inventory/audits/[auditId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'inventory');
    requirePermission(tenant.user, 'inventory', 'audits');

    const audit = await getInventoryAuditById(params.auditId);
    if (!audit || audit.organizationId !== tenant.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    if (body.action === 'complete') {
      await completeAudit(params.auditId);
      await auditLog.create({
        tenant,
        action: 'INVENTORY_AUDIT_COMPLETED',
        module: 'inventory',
        recordId: params.auditId,
        newValue: { title: audit.title },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PATCH /api/inventory/audits/[auditId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
