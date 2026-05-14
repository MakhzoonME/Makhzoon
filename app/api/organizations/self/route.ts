import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrganizationById } from '@/lib/db/organizations';
import { getSuperAdminUserById } from '@/lib/db/superadmin-users';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/** PII scrub script (scripts/clone-firestore.ts) replaces real contact emails
 *  with this synthetic pattern in non-prod envs. When we detect it, fall back
 *  to the org owner's Firebase Auth email so the page shows the real value. */
const SCRUBBED_ORG_EMAIL = /^org-.+@example\.test$/i;

async function resolveOrgOwnerEmail(orgId: string): Promise<string | null> {
  const snap = await adminDb.collection('users')
    .where('organizationId', '==', orgId)
    .where('role', '==', 'org_owner')
    .limit(1)
    .get();
  if (snap.empty) return null;
  const ownerId = snap.docs[0].id;
  try {
    const authUser = await adminAuth.getUser(ownerId);
    return authUser.email ?? null;
  } catch {
    return null;
  }
}

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

    let contactEmail = org.contactEmail;
    if (contactEmail && SCRUBBED_ORG_EMAIL.test(contactEmail)) {
      const ownerEmail = await resolveOrgOwnerEmail(orgId);
      if (ownerEmail) contactEmail = ownerEmail;
    }

    let accountManager: { id: string; name: string; email: string } | null = null;
    if (org.assignedMemberId) {
      const member = await getSuperAdminUserById(org.assignedMemberId);
      if (member) {
        accountManager = { id: member.id, name: member.displayName ?? '', email: member.email };
      } else {
        // Fallback: member may exist only in Firebase Auth (synthetic member)
        const authUser = await adminAuth.getUser(org.assignedMemberId).catch(() => null);
        if (authUser) {
          accountManager = {
            id: authUser.uid,
            name: authUser.displayName ?? '',
            email: authUser.email ?? '',
          };
        }
      }
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      subdomain: org.subdomain,
      contactEmail,
      description: org.description,
      category: org.category,
      accountManager,
    });
  } catch (err) {
    console.error('[GET /api/organizations/self]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
