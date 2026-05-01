import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getInventoryAudits, createInventoryAudit } from '@/lib/db/inventory-audits';
import { getAssets } from '@/lib/db/assets';
import { writeAuditLog } from '@/lib/audit/logger';
import { inventoryAuditSchema } from '@/lib/validations/inventory.schema';

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const audits = await getInventoryAudits(orgId);
    return NextResponse.json({ audits });
  } catch (err) {
    console.error('[GET /api/inventory/audits]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json();
    const parsed = inventoryAuditSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Load all active assets to seed the audit
    const { items: assets } = await getAssets(orgId, { status: 'Active', limit: 1000 });

    const id = await createInventoryAudit({
      organizationId: orgId,
      title: parsed.data.title,
      notes: parsed.data.notes,
      startedBy: user.uid,
      startedByName: user.displayName || user.email || undefined,
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        serialNumber: a.serialNumber,
        location: a.location,
        assignedTo: a.assignedTo,
      })),
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'INVENTORY_AUDIT_STARTED',
      module: 'inventory',
      recordId: id,
      newValue: { title: parsed.data.title, totalAssets: assets.length },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/inventory/audits]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
