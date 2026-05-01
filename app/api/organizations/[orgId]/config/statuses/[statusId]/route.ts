import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { updateStatus, deleteStatus } from '@/lib/db/organization-configs';
import { getOrganizationById } from '@/lib/db/organizations';
import { statusPatchSchema } from '@/lib/validations/organization-config.schema';
import { writeAuditLog } from '@/lib/audit/logger';

interface Params { params: { orgId: string; statusId: string } }

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const org = await getOrganizationById(params.orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await req.json();
    const parsed = statusPatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    try {
      const { status, statuses } = await updateStatus(params.orgId, params.statusId, parsed.data, user.uid);
      if (!status) return NextResponse.json({ error: 'Status not found' }, { status: 404 });
      await writeAuditLog({
        organizationId: params.orgId,
        userId: user.uid,
        role: user.role,
        action: 'CONFIG_STATUS_UPDATED',
        module: 'organizationConfig',
        recordId: params.statusId,
        newValue: parsed.data as Record<string, unknown>,
      });
      return NextResponse.json({ status, statuses });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'duplicate') return NextResponse.json({ error: (err as Error).message }, { status: 409 });
      throw err;
    }
  } catch (err) {
    console.error('[PUT /api/organizations/[orgId]/config/statuses/[statusId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const org = await getOrganizationById(params.orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    try {
      const { removed, statuses } = await deleteStatus(params.orgId, params.statusId, user.uid);
      if (!removed) return NextResponse.json({ error: 'Status not found' }, { status: 404 });
      await writeAuditLog({
        organizationId: params.orgId,
        userId: user.uid,
        role: user.role,
        action: 'CONFIG_STATUS_DELETED',
        module: 'organizationConfig',
        recordId: params.statusId,
        oldValue: removed as unknown as Record<string, unknown>,
      });
      return NextResponse.json({ success: true, statuses });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'min_required') return NextResponse.json({ error: (err as Error).message }, { status: 400 });
      throw err;
    }
  } catch (err) {
    console.error('[DELETE /api/organizations/[orgId]/config/statuses/[statusId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
