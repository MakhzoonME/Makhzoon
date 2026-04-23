import { adminAuth } from './admin';
import { AuthUser, UserRole } from '@/types';
import { cookies } from 'next/headers';
import { getRequestSubdomain } from '@/lib/subdomain';
import { getOrganizationBySubdomain } from '@/lib/firestore/organizations';

export async function verifySessionCookie(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const role = decoded.role as UserRole;
    const claimOrgId = (decoded.organizationId as string | undefined) ?? null;
    let organizationId = claimOrgId;

    // Subdomain takes precedence over transferOrgId cookie when present.
    // - super_admin: subdomain acts as implicit transfer mode
    // - members: must belong to the subdomain's org
    const subdomain = await getRequestSubdomain();
    if (subdomain) {
      const org = await getOrganizationBySubdomain(subdomain);
      if (!org) return null;
      if (role === 'super_admin') {
        organizationId = org.id;
      } else if (claimOrgId === org.id) {
        organizationId = org.id;
      } else {
        // Signed in but not a member of this tenant
        return null;
      }
    } else if (role === 'super_admin') {
      const transferOrgId = cookieStore.get('transferOrgId')?.value;
      if (transferOrgId) organizationId = transferOrgId;
    }

    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: decoded.name ?? '',
      role,
      organizationId,
    };
  } catch {
    return null;
  }
}

export async function verifyIdToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: decoded.name ?? '',
      role: decoded.role as UserRole,
      organizationId: decoded.organizationId ?? null,
    };
  } catch {
    return null;
  }
}
