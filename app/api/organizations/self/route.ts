import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrganizationById } from '@/lib/db/organizations';
import { getSuperAdminUserById } from '@/lib/db/superadmin-users';

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin']);
    const isAdmin = ADMIN_ROLES.has(user.role);
    const hasOrgInfoPerm = user.role === 'staff' && user.permissions?.settings?.orgInfo === true;
    if (!isAdmin && !hasOrgInfoPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization associated with this account' }, { status: 403 });

    const org = await getOrganizationById(orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    let accountManager: { id: string; name: string; email: string } | null = null;
    if (org.assignedMemberId) {
      const member = await getSuperAdminUserById(org.assignedMemberId);
      if (member) {
        accountManager = { id: member.id, name: member.displayName, email: member.email };
      }
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      subdomain: org.subdomain,
      contactEmail: org.contactEmail,
      description: org.description,
      category: org.category,
      accountManager,
    });
  } catch (err) {
    console.error('[GET /api/organizations/self]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
