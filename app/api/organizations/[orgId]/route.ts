import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getOrganizationById, updateOrganization } from '@/lib/db/organizations';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { queueAuditLog } from '@/lib/audit/logger';
import { organizationUpdateSchema } from '@/lib/validations/organization.schema';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const org = await getOrganizationById(orgId);
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const subscription = await getSubscriptionByOrg(orgId);
    return NextResponse.json({ ...org, subscription });
  } catch (err) {
    console.error('[GET /api/organizations/[orgId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const existing = await getOrganizationById(orgId);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const parsed = organizationUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await updateOrganization(orgId, {
      ...parsed.data,
      updatedBy: user.uid,
    });

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'ORGANIZATION_UPDATED',
      module: 'organizations',
      recordId: orgId,
      oldValue: { name: existing.name, category: existing.category },
      newValue: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/organizations/[orgId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
