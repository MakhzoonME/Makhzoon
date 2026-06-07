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
import type { SuperAdminPermissions } from '@/types/superadmin-permissions.types';

const SUPERADMIN_ROLES = new Set<UserRole>([
  'super_admin',
  'makhzoon_admin',
  'makhzoon_support',
]);
const ORG_ROLES = new Set<UserRole>(['org_owner', 'admin', 'staff']);

/**
 * Local-only auth bypass — DO NOT use in any deployed env.
 * Active only when `next dev` is running AND LOCAL_AUTH_BYPASS_USER_ID
 * is set in the gitignored .env.local. Cloud dev/staging/prod run
 * NODE_ENV=production so this short-circuits to null there.
 */
async function localAuthBypass(): Promise<AuthUser | null> {
  if (process.env.NODE_ENV !== 'development') return null;
  const bypassUid = process.env.LOCAL_AUTH_BYPASS_USER_ID;
  if (!bypassUid) return null;

  const { data: row, error } = await supabaseAdmin
    .from('users')
    .select('role, organization_id, display_name, email, permissions')
    .eq('id', bypassUid)
    .maybeSingle();
  if (error || !row) {
    console.warn(
      '[auth] LOCAL_AUTH_BYPASS_USER_ID set but no public.users row for',
      bypassUid,
    );
    return null;
  }

  return {
    uid: bypassUid,
    email: (row.email as string) ?? '',
    displayName: (row.display_name as string) ?? '',
    role: (row.role as UserRole) ?? 'staff',
    organizationId: (row.organization_id as string) ?? null,
    permissions: (row.permissions as UserPermissions | null) ?? null,
  };
}

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
    const bypass = await localAuthBypass();
    if (bypass) return bypass;

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

    let role = ((claims.app_metadata as Record<string, unknown>)?.role as
      UserRole | undefined) ?? undefined;
    let organizationId =
      ((claims.app_metadata as Record<string, unknown>)
        ?.organization_id as string | undefined) ?? null;

    if (!role) {
      const { data: saRow } = await supabaseAdmin
        .from('superadmin_users')
        .select('role')
        .eq('id', baseUid)
        .maybeSingle();
      if (saRow) {
        role = saRow.role as UserRole;
      } else {
        const { data: appRow } = await supabaseAdmin
          .from('users')
          .select('role, organization_id')
          .eq('id', baseUid)
          .maybeSingle();
        if (appRow) {
          role = appRow.role as UserRole;
          if (!organizationId) organizationId = appRow.organization_id as string | null;
        }
      }
    }

    role ??= 'staff' as UserRole;

    // Superadmin family may act as a tenant admin via transferOrgId.
    if (SUPERADMIN_ROLES.has(role)) {
      const transferOrgId = cookieStore.get('transferOrgId')?.value;
      if (transferOrgId) organizationId = transferOrgId;
    }

    let displayName = '';
    let email = baseEmail;
    let permissions: UserPermissions | null = null;
    let saPermissions: SuperAdminPermissions | null = null;
    let allSpaces = false;

    // public.users is authoritative for org-scoped accounts (mirrors the
    // legacy "Firestore is authoritative" behavior).
    if (ORG_ROLES.has(role)) {
      const { data: row } = await supabaseAdmin
        .from('users')
        .select('role, organization_id, display_name, email, permissions, all_spaces')
        .eq('id', baseUid)
        .maybeSingle();
      if (row) {
        role = (row.role as UserRole) ?? role;
        organizationId = (row.organization_id as string) ?? organizationId;
        displayName = (row.display_name as string) ?? '';
        email = (row.email as string) ?? email;
      }
      allSpaces = (row?.all_spaces as boolean | null) ?? false;

      if (organizationId) {
        const cachedPerms = getCachedPermissions(baseUid);
        if (cachedPerms !== undefined) {
          permissions = cachedPerms;
        } else {
          permissions = ((row?.permissions as UserPermissions | null) ?? null);
          setCachedPermissions(baseUid, permissions);
        }
      }
    }

    // Load platform-scoped permissions for superadmin team members.
    if (SUPERADMIN_ROLES.has(role)) {
      const { data: saRow } = await supabaseAdmin
        .from('superadmin_users')
        .select('display_name, email, permissions')
        .eq('id', baseUid)
        .maybeSingle();
      if (saRow) {
        displayName = (saRow.display_name as string) ?? displayName;
        email = (saRow.email as string) ?? email;
        saPermissions = (saRow.permissions as SuperAdminPermissions | null) ?? null;
      }
    }

    const authUser: AuthUser = {
      uid: baseUid,
      email,
      displayName,
      role,
      organizationId,
      permissions,
      saPermissions,
      allSpaces: ORG_ROLES.has(role) ? allSpaces : undefined,
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
