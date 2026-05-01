import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { updateLocation, deleteLocation } from '@/lib/db/organization-configs';
import { getOrganizationById } from '@/lib/db/organizations';
import { locationPatchSchema } from '@/lib/validations/organization-config.schema';
import { writeAuditLog } from '@/lib/audit/logger';

interface Params { params: { orgId: string; locationId: string } }

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const org = await getOrganizationById(params.orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await req.json();
    const parsed = locationPatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    try {
      const { location, locations } = await updateLocation(params.orgId, params.locationId, parsed.data, user.uid);
      if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      await writeAuditLog({
        organizationId: params.orgId,
        userId: user.uid,
        role: user.role,
        action: 'CONFIG_LOCATION_UPDATED',
        module: 'organizationConfig',
        recordId: params.locationId,
        newValue: parsed.data as Record<string, unknown>,
      });
      return NextResponse.json({ location, locations });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'duplicate') return NextResponse.json({ error: (err as Error).message }, { status: 409 });
      throw err;
    }
  } catch (err) {
    console.error('[PUT /api/organizations/[orgId]/config/locations/[locationId]]', err);
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

    const { removed, locations } = await deleteLocation(params.orgId, params.locationId, user.uid);
    if (!removed) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    await writeAuditLog({
      organizationId: params.orgId,
      userId: user.uid,
      role: user.role,
      action: 'CONFIG_LOCATION_DELETED',
      module: 'organizationConfig',
      recordId: params.locationId,
      oldValue: removed as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ success: true, locations });
  } catch (err) {
    console.error('[DELETE /api/organizations/[orgId]/config/locations/[locationId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
