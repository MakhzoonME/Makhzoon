import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrganizationBySubdomain } from '@/lib/db/organizations';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // SECURITY: Only super_admin can lookup orgs by subdomain (prevents enumeration)
    // Org users can only see their own org via organizationId in their session
    if (user.role !== 'super_admin') {
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
