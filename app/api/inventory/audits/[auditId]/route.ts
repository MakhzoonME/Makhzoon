import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getInventoryAuditById, getAuditItems, completeAudit } from '@/lib/db/inventory-audits';
import { writeAuditLog } from '@/lib/audit/logger';

interface Params { params: { auditId: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const audit = await getInventoryAuditById(params.auditId);
    if (!audit || audit.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const items = await getAuditItems(params.auditId);
    return NextResponse.json({ audit, items });
  } catch (err) {
    console.error('[GET /api/inventory/audits/[auditId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const audit = await getInventoryAuditById(params.auditId);
    if (!audit || audit.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    if (body.action === 'complete') {
      await completeAudit(params.auditId);
      await writeAuditLog({
        organizationId: user.organizationId!,
        userId: user.uid,
        role: user.role,
        action: 'INVENTORY_AUDIT_COMPLETED',
        module: 'inventory',
        recordId: params.auditId,
        newValue: { title: audit.title },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/inventory/audits/[auditId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
