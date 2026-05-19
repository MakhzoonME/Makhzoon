import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { addLocation } from '@/lib/db/organization-configs';
import { getOrganizationById } from '@/lib/db/organizations';
import { locationInputSchema } from '@/lib/validations/organization-config.schema';
import { queueAuditLog } from '@/lib/audit/logger';

export async function POST(req: NextRequest, props: { params: Promise<{ orgId: string }> }) {
  const params = await props.params;
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const org = await getOrganizationById(params.orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await req.json();
    const parsed = locationInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    try {
      const { location, locations } = await addLocation(params.orgId, parsed.data, user.uid);
      queueAuditLog({
        organizationId: params.orgId,
        userId: user.uid,
        role: user.role,
        action: 'CONFIG_LOCATION_CREATED',
        module: 'organizationConfig',
        recordId: location.id,
        newValue: { ...location },
      });
      return NextResponse.json({ location, locations }, { status: 201 });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'duplicate') return NextResponse.json({ error: (err as Error).message }, { status: 409 });
      throw err;
    }
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/config/locations]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
