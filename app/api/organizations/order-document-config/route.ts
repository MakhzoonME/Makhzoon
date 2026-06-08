import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { queueAuditLog } from '@/lib/audit/logger';

const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin']);

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { data } = await supabaseAdmin
      .from('organization_configs')
      .select('order_document_config')
      .eq('organization_id', user.organizationId)
      .maybeSingle();

    return NextResponse.json(data?.order_document_config ?? {});
  } catch (err) {
    console.error('[GET /api/organizations/order-document-config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const orgId = user.organizationId;

    const body = await req.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 422 });
    }

    const { error } = await supabaseAdmin
      .from('organization_configs')
      .upsert(
        { organization_id: orgId, order_document_config: body, updated_by: user.uid },
        { onConflict: 'organization_id' },
      );

    if (error) throw error;
    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'ORDER_DOCUMENT_CONFIG_UPDATED',
      module: 'settings',
      newValue: body as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/organizations/order-document-config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
