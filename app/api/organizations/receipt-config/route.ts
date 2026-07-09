import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { queueAuditLog } from '@/lib/audit/logger';
import { z } from 'zod';

const configObjectSchema = z.record(z.string(), z.unknown());

const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin']);

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { data } = await supabaseAdmin
      .from('organization_configs')
      .select('receipt_config')
      .eq('organization_id', orgId)
      .maybeSingle();

    return NextResponse.json(data?.receipt_config ?? {});
  } catch (err) {
    console.error('[GET /api/organizations/receipt-config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const parsedBody = configObjectSchema.safeParse(await req.json().catch(() => null));
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 422 });
    }
    const body = parsedBody.data;

    // Load existing config so we can merge instead of replace — this lets
    // the org-info branding section and the receipt settings page each save
    // their own slice without clobbering the other's fields.
    const { data: existing } = await supabaseAdmin
      .from('organization_configs')
      .select('receipt_config')
      .eq('organization_id', orgId)
      .maybeSingle();

    const prev = (existing?.receipt_config ?? {}) as Record<string, unknown>;
    const merged = {
      ...prev,
      ...body,
      config: {
        ...(prev.config as Record<string, unknown> ?? {}),
        ...((body.config as Record<string, unknown>) ?? {}),
      },
    };

    const { error } = await supabaseAdmin
      .from('organization_configs')
      .upsert(
        { organization_id: orgId, receipt_config: merged, updated_by: user.uid },
        { onConflict: 'organization_id' },
      );

    if (error) throw error;
    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'RECEIPT_CONFIG_UPDATED',
      module: 'settings',
      newValue: body as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/organizations/receipt-config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
