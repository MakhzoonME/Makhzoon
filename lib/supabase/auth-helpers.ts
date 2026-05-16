import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from './server';
import { supabaseAdmin } from './admin';
import {
  getCachedSession,
  setCachedSession,
  getCachedPermissions,
  setCachedPermissions,
} from './session-cache';
import { isSessionRevoked } from './session-revocation';
import type { AuthUser, UserRole } from '@/types';
import type { UserPermissions } from '@/types/user-permissions.types';

const SUPERADMIN_ROLES = new Set<UserRole>([
  'super_admin',
  'makhzoon_admin',
  'makhzoon_support',
]);
const ORG_ROLES = new Set<UserRole>(['org_owner', 'admin', 'staff']);

/** Decode a JWT payload without verifying (getUser() already verified). */
function decodeJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(
      payload.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Authoritative session resolver — Supabase replacement for the Firebase
 * verifySessionCookie(). Behavior is preserved 1:1:
 *  - validates the Supabase session (JWT) from the request cookies
 *  - rejects revoked sessions (deny-list keyed by JWT session_id)
 *  - re-reads role / organization_id / permissions from public.users so role
 *    and org changes take effect WITHOUT re-auth (token claims are stale)
 *  - superadmin family may impersonate a tenant via the transferOrgId cookie
 *  - short-lived cache to keep auth-server / DB load low
 */
export async function verifySessionCookie(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const accessToken = session.access_token;
    const claims = decodeJwt(accessToken);
    const sessionId = (claims.session_id as string) ?? '';

    if (sessionId && (await isSessionRevoked(sessionId))) return null;

    const cookieStore = await cookies();

    const cached = getCachedSession(accessToken);
    let baseUid: string;
    let baseEmail: string;

    if (cached) {
      baseUid = cached.uid;
      baseEmail = cached.email;
    } else {
      // getUser() validates the JWT against the auth server and confirms the
      // account is still active (deleted/banned users error here).
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) return null;
      baseUid = user.id;
      baseEmail = user.email ?? '';
    }

    let role = ((claims.app_metadata as Record<string, unknown>)?.role ??
      'staff') as UserRole;
    let organizationId =
      ((claims.app_metadata as Record<string, unknown>)
        ?.organization_id as string | undefined) ?? null;

    // Superadmin family may act as a tenant admin via transferOrgId.
    if (SUPERADMIN_ROLES.has(role)) {
      const transferOrgId = cookieStore.get('transferOrgId')?.value;
      if (transferOrgId) organizationId = transferOrgId;
    }

    let displayName = '';
    let email = baseEmail;
    let permissions: UserPermissions | null = null;

    // public.users is authoritative for org-scoped accounts (mirrors the
    // legacy "Firestore is authoritative" behavior).
    if (ORG_ROLES.has(role)) {
      const { data: row } = await supabaseAdmin
        .from('users')
        .select('role, organization_id, display_name, email, permissions')
        .eq('id', baseUid)
        .maybeSingle();
      if (row) {
        role = (row.role as UserRole) ?? role;
        organizationId = (row.organization_id as string) ?? organizationId;
        displayName = (row.display_name as string) ?? '';
        email = (row.email as string) ?? email;
      }

      if (organizationId) {
        const cachedPerms = getCachedPermissions(baseUid);
        if (cachedPerms !== undefined) {
          permissions = cachedPerms;
        } else {
          permissions =
            ((row?.permissions as UserPermissions | null) ?? null);
          setCachedPermissions(baseUid, permissions);
        }
      }
    }

    const authUser: AuthUser = {
      uid: baseUid,
      email,
      displayName,
      role,
      organizationId,
      permissions,
    };

    if (!cached) setCachedSession(accessToken, authUser);
    return authUser;
  } catch {
    return null;
  }
}

/**
 * Verify a raw Supabase access token (used where a bearer token is presented
 * instead of the session cookie). Mirrors the Firebase verifyIdToken().
 */
export async function verifyIdToken(token: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;
    const claims = decodeJwt(token);
    const meta = (claims.app_metadata as Record<string, unknown>) ?? {};
    return {
      uid: data.user.id,
      email: data.user.email ?? '',
      displayName: '',
      role: (meta.role as UserRole) ?? 'staff',
      organizationId: (meta.organization_id as string) ?? null,
    };
  } catch {
    return null;
  }
}
