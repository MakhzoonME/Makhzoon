import { adminAuth } from './admin';
import { AuthUser, UserRole } from '@/types';
import { cookies } from 'next/headers';

export async function verifySessionCookie(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const role = decoded.role as UserRole;
    let organizationId = (decoded.organizationId as string | undefined) ?? null;

    // Super admins can "enter" an organization via transfer mode; a transferOrgId
    // cookie is set by /api/organizations/[orgId]/transfer and acts as the effective org.
    if (role === 'super_admin') {
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
