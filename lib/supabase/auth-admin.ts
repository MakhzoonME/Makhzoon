import 'server-only';
import { supabaseAdmin } from './admin';
import type { UserRole } from '@/types';

/**
 * Server-side user provisioning — Supabase replacement for the firebase-admin
 * `adminAuth.createUser` + `setCustomUserClaims` pair. The role and
 * organization are written to `app_metadata` so they land in the JWT and are
 * read by verifySessionCookie() / RLS.
 *
 * Greenfield/internal-staging note: created users are email-confirmed so they
 * can sign in immediately (the legacy "set your password via email" flow is
 * still available through /api/auth/password-reset).
 */
export async function createAuthUser(params: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  organizationId: string | null;
}): Promise<{ uid: string }> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { display_name: params.displayName },
    app_metadata: {
      role: params.role,
      ...(params.organizationId
        ? { organization_id: params.organizationId }
        : {}),
    },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Failed to create auth user');
  }
  return { uid: data.user.id };
}

export async function deleteAuthUser(uid: string): Promise<void> {
  await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => undefined);
}

/** Update display name and/or role. Role goes to app_metadata (JWT/RLS);
 *  display name to user_metadata. Replacement for adminAuth.updateUser +
 *  setCustomUserClaims. */
export async function updateAuthUser(
  uid: string,
  patch: { displayName?: string; role?: UserRole },
): Promise<void> {
  const attrs: Record<string, unknown> = {};
  if (patch.displayName !== undefined) {
    attrs.user_metadata = { display_name: patch.displayName };
  }
  if (patch.role !== undefined) {
    attrs.app_metadata = { role: patch.role };
  }
  if (Object.keys(attrs).length === 0) return;
  const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, attrs);
  if (error) throw new Error(error.message);
}

/** Deactivate/reactivate an account. Supabase has no `disabled` flag; we use
 *  an effectively-permanent ban for deactivated users. Replacement for
 *  adminAuth.updateUser({disabled}) + revokeRefreshTokens. */
export async function setAuthUserActive(
  uid: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
    ban_duration: active ? 'none' : '876000h', // ~100 years
  });
  if (error) throw new Error(error.message);
  if (!active) await revokeAuthUserSessions(uid);
}

/** Sign the user out everywhere (invalidate refresh tokens). Replacement for
 *  adminAuth.revokeRefreshTokens. */
export async function revokeAuthUserSessions(uid: string): Promise<void> {
  await supabaseAdmin.auth.admin
    .signOut(uid, 'global')
    .catch(() => undefined);
}

/**
 * True when an account already exists for this email. We check public.users
 * (kept in sync with auth.users) rather than the Auth admin API, which has no
 * direct get-by-email. Username accounts use the synthetic
 * `<username>@makhzoon.local` address, so this covers them too.
 */
export async function authEmailExists(email: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .limit(1)
    .maybeSingle();
  return !!data;
}
