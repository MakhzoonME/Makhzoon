import { adminAuth } from './admin';
import { AuthUser, UserRole } from '@/types';
import { cookies } from 'next/headers';
import { getCachedSession, setCachedSession } from './session-cache';

export async function verifySessionCookie(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;

    const cached = getCachedSession(session);
    const decoded = cached ?? await adminAuth.verifySessionCookie(session, true);
    if (!cached) {
      // Verify the user is still active (not disabled/deleted) before caching
      const firebaseUser = await adminAuth.getUser(decoded.uid);
      if (firebaseUser.disabled) return null;
      setCachedSession(session, decoded);
    }

    const role = decoded.role as UserRole;
    let organizationId = (decoded.organizationId as string | undefined) ?? null;

    // Super admin may use the transferOrgId cookie to act as a tenant admin
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
