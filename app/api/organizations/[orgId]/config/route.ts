import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrCreateOrganizationConfig } from '@/lib/db/organization-configs';
import { getOrganizationById } from '@/lib/db/organizations';

export async function GET(_req: NextRequest, props: { params: Promise<{ orgId: string }> }) {
  const params = await props.params;
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orgId } = params;
    // makhzoon_admin and super_admin can read any org config; makhzoon_support cannot (configuration page is restricted).
    // Org members can read their own org config.
    const CONFIG_ROLES = new Set(['super_admin', 'makhzoon_admin']);
    if (!CONFIG_ROLES.has(user.role) && user.organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const org = await getOrganizationById(orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const cfg = await getOrCreateOrganizationConfig(orgId, user.uid);
    return NextResponse.json(cfg, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[GET /api/organizations/[orgId]/config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
