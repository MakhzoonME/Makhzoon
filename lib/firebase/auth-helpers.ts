import { adminAuth, adminDb } from './admin';
import { AuthUser, UserRole, UserPermissions } from '@/types';
import { cookies } from 'next/headers';
import { getCachedSession, setCachedSession, getCachedPermissions, setCachedPermissions } from './session-cache';
import { isSessionRevoked } from './session-revocation';

export async function verifySessionCookie(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;

    // Check if session has been explicitly revoked
    const revoked = await isSessionRevoked(session);
    if (revoked) return null;

    const cached = getCachedSession(session);
    const decoded = cached ?? await adminAuth.verifySessionCookie(session, true);
    if (!cached) {
      // Verify the user is still active (not disabled/deleted) before caching
      const firebaseUser = await adminAuth.getUser(decoded.uid);
      if (firebaseUser.disabled) return null;
      setCachedSession(session, decoded);
    }

    let role = decoded.role as UserRole;
    let organizationId = (decoded.organizationId as string | undefined) ?? null;

    // Super admin may use the transferOrgId cookie to act as a tenant admin
    if (role === 'super_admin') {
      const transferOrgId = cookieStore.get('transferOrgId')?.value;
      if (transferOrgId) organizationId = transferOrgId;
    }

    // Fetch the authoritative role from Firestore so role changes take effect
    // immediately without requiring re-authentication. Token custom claims
    // are only refreshed on sign-in, but the Firestore user document is
    // updated at the time of the role change.
    const ORG_ROLES = new Set(['org_owner', 'admin', 'staff']);
    if (ORG_ROLES.has(role) && organizationId) {
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
      if (userDoc.exists) {
        const docData = userDoc.data();
        role = (docData?.role as UserRole) ?? role;
        organizationId = docData?.organizationId ?? organizationId;
      }
    }

    // Fetch stored permissions for all org-level roles so explicit customisation works
    let permissions: UserPermissions | null = null;
    if (ORG_ROLES.has(role) && organizationId) {
      const cachedPerms = getCachedPermissions(decoded.uid);
      if (cachedPerms !== undefined) {
        permissions = cachedPerms;
      } else {
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        permissions = (userDoc.exists ? (userDoc.data()?.permissions ?? null) : null) as UserPermissions | null;
        setCachedPermissions(decoded.uid, permissions);
      }
    }

    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: decoded.name ?? '',
      role,
      organizationId,
      permissions,
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
