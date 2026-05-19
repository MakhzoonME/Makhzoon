import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requirePermission } from '@/lib/permissions/require';
import { getInventoryAuditById, updateAuditItem } from '@/lib/db/inventory-audits';

interface Params { params: Promise<{ auditId: string }> }

export async function POST(req: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    requirePermission(tenant.user, 'inventory', 'audits');

    const audit = await getInventoryAuditById(params.auditId);
    if (!audit || audit.organizationId !== tenant.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (audit.status === 'completed') return NextResponse.json({ error: 'Audit already completed' }, { status: 409 });

    const body = await req.json();
    const { auditItemId, status, note } = body as { auditItemId: string; status: 'found' | 'missing'; note?: string };

    if (!auditItemId || !['found', 'missing'].includes(status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 422 });
    }

    await updateAuditItem(
      auditItemId,
      params.auditId,
      status,
      { uid: tenant.userId, displayName: tenant.user.displayName || undefined },
      note
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/inventory/audits/[auditId]/items]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
