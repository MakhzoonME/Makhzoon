import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getOrganizationBySubdomain } from '@/lib/db/organizations';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // SECURITY: Only superadmin roles can lookup orgs by subdomain (prevents enumeration by org users)
    const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
    if (!SUPERADMIN_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { subdomain } = await params;
    const org = await getOrganizationBySubdomain(subdomain);
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: org.id, name: org.name, subdomain: org.subdomain });
  } catch (err) {
    console.error('[GET /api/organizations/by-subdomain/[subdomain]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
