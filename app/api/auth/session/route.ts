import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrganizationById } from '@/lib/db/organizations';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { getUserById } from '@/lib/db/users';
import { invalidateCachedSession } from '@/lib/supabase/session-cache';
import { revokeSession } from '@/lib/supabase/session-revocation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { UserRole } from '@/types';

const ORG_ROLES = new Set<UserRole>(['org_owner', 'admin', 'staff']);

function decodeJwt(token: string): Record<string, unknown> {
  try {
    return JSON.parse(
      Buffer.from(
        token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf8'),
    );
  } catch {
    return {};
  }
}

/**
 * Establishes the server view of an already-signed-in Supabase session.
 * The browser client (signInWithPassword via @supabase/ssr) sets the auth
 * cookies; this endpoint validates them, enforces the org-suspended gate, and
 * returns the post-login routing payload — preserving the legacy contract
 * { role, orgSlug, features, permissions } used by the login page.
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`session:${clientIp}`, 5, 15 * 60 * 1000, {
      action: 'sign in',
    });
    if (rl) return rl;

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let role = (user.app_metadata?.role as UserRole) ?? undefined;
    let orgId =
      (user.app_metadata?.organization_id as string | undefined) ?? undefined;

    if (!role) {
      const { data: saUser } = await supabaseAdmin
        .from('superadmin_users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (saUser) role = saUser.role as UserRole;
    }

    // public.users is authoritative for org-scoped accounts. Resolve from it
    // whenever role is still unknown OR organization_id is missing — the latter
    // happens when app_metadata carries `role` but not `organization_id` (e.g.
    // after a role edit, which writes role-only). Mirrors verifySessionCookie().
    if (!role || (!orgId && ORG_ROLES.has(role))) {
      const { data: appUser } = await supabaseAdmin
        .from('users')
        .select('role, organization_id')
        .eq('id', user.id)
        .maybeSingle();
      if (appUser) {
        role ??= appUser.role as UserRole;
        if (!orgId) orgId = (appUser.organization_id as string | null) ?? undefined;
      }
    }

    if (!role) {
      return NextResponse.json({ error: 'No account found' }, { status: 403 });
    }

    let orgSlug: string | null = null;
    let features: Record<string, boolean> = {};
    let orgSuspended = false;

    if (orgId) {
      const [org, subscription] = await Promise.all([
        getOrganizationById(orgId),
        getSubscriptionByOrg(orgId),
      ]);
      orgSlug = org?.subdomain ?? null;
      if (subscription?.features)
        features = subscription.features as Record<string, boolean>;
      if (subscription?.status === 'SUSPENDED' && role !== 'super_admin') {
        orgSuspended = true;
      }
    }

    if (orgSuspended) {
      return NextResponse.json(
        { error: 'Organization suspended', orgSuspended: true },
        { status: 403 },
      );
    }

    // Load org-scoped permissions for ALL org roles (not just staff) so the
    // frontend can correctly gate UI for admins with custom restrictions.
    let permissions = null;
    const ORG_ROLES_SET = new Set(['org_owner', 'admin', 'staff']);
    if (ORG_ROLES_SET.has(role) && orgId) {
      const u = await getUserById(user.id);
      permissions = u?.permissions ?? null;
    }

    // Load platform-scoped permissions for superadmin team members.
    let saPermissions = null;
    const SUPERADMIN_ROLES_SET = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
    if (SUPERADMIN_ROLES_SET.has(role)) {
      const { data: saRow } = await supabaseAdmin
        .from('superadmin_users')
        .select('permissions')
        .eq('id', user.id)
        .maybeSingle();
      saPermissions = (saRow?.permissions as Record<string, unknown> | null) ?? null;
    }

    return NextResponse.json(
      { role, orgSlug, features, permissions, saPermissions },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Session creation error:', msg);
    return NextResponse.json(
      { error: 'Unauthorized', detail: msg },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    invalidateCachedSession(session.access_token);
    const claims = decodeJwt(session.access_token);
    const sessionId = (claims.session_id as string) ?? '';
    const userId = (claims.sub as string) ?? '';
    if (sessionId && userId) {
      // Supabase access tokens are ~1h; keep the deny-list row a bit longer.
      const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 1000);
      await revokeSession(sessionId, userId, expiresAt);
    }
  }

  // Invalidate refresh tokens server-side, then clear cookies. @supabase/ssr
  // clears its own auth cookies as part of signOut().
  await supabase.auth.signOut().catch(() => {});

  const isSecure = process.env.NODE_ENV !== 'development';
  cookieStore.set('transferOrgId', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict',
  });

  return NextResponse.json({ success: true });
}
