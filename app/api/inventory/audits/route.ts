import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { requirePermission } from '@/lib/permissions/require';
import { getInventoryAudits, createInventoryAudit } from '@/lib/db/inventory-audits';
import { getAssets } from '@/lib/db/assets';
import { auditLog } from '@/lib/platform/audit';
import { inventoryAuditSchema } from '@/lib/validations/inventory.schema';

export async function GET() {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'inventory');
    const audits = await getInventoryAudits(tenant.organizationId, tenant.spaceId);
    return NextResponse.json({ audits });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/inventory/audits]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'inventory');
    requirePermission(tenant.user, 'inventory', 'audits');

    const body = await req.json();
    const parsed = inventoryAuditSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Load all active assets to seed the audit
    // Load active assets to seed the audit, narrowed by the chosen scope
    const { scope, category, location } = parsed.data;
    const { items: allAssets } = await getAssets(tenant.organizationId, {
      spaceId: tenant.spaceId,
      status: 'Active',
      category: scope === 'category' ? category : undefined,
      pageSize: 1000,
    });
    const assets = scope === 'location' && location
      ? allAssets.filter((a) => a.location === location)
      : allAssets;

    const id = await createInventoryAudit({
      organizationId: tenant.organizationId,
      spaceId: tenant.spaceId,
      title: parsed.data.title,
      notes: parsed.data.notes,
      startedBy: tenant.userId,
      startedByName: tenant.user.displayName || tenant.user.email || undefined,
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        serialNumber: a.serialNumber,
        location: a.location,
        assignedTo: a.assignedTo,
      })),
    });

    await auditLog.create({
      tenant,
      action: 'INVENTORY_AUDIT_STARTED',
      module: 'inventory',
      recordId: id,
      newValue: { title: parsed.data.title, totalAssets: assets.length },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/inventory/audits]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
