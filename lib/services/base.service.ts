import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { hasPermission } from '@/lib/permissions';
import { AuthUser } from '@/types/auth.types';

/**
 * Verify session and return authenticated user.
 * Throws error responses that can be returned directly to client.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await verifySessionCookie();
  if (!user) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.organizationId) {
    throw NextResponse.json({ error: 'No organization' }, { status: 400 });
  }
  return user;
}

/**
 * Verify user has specific permission for a module/action.
 * Throws 403 if not permitted.
 */
export async function requirePermission(
  user: AuthUser,
  module: 'assets' | 'inventory' | 'warranties' | 'requests' | 'support' | 'reports' | 'audit-logs' | 'users',
  action: 'view' | 'create' | 'update' | 'delete'
): Promise<void> {
  // Convert kebab-case to camelCase for auditLogs
  const camelCaseModule = module === 'audit-logs' ? 'auditLogs' : module;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!hasPermission(user, camelCaseModule as any, action)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

/**
 * Verify organization subscription is active.
 * Throws 403 if subscription is not active.
 * Skips check if user is a super_admin (they can act on any org).
 */
export async function requireActiveSubscription(orgId: string, user?: AuthUser): Promise<void> {
  if (user?.role === 'super_admin') return;
  const sub = await getSubscriptionByOrg(orgId);
  if (sub && sub.status !== 'ACTIVE') {
    throw NextResponse.json(
      { error: 'Subscription expired or suspended' },
      { status: 403 }
    );
  }
}

/**
 * Verify subscription has feature enabled.
 * Throws 403 if feature is not enabled.
 */
export async function requireFeature(orgId: string, featureKey: string): Promise<void> {
  const sub = await getSubscriptionByOrg(orgId);
  if (!sub?.features || !sub.features[featureKey]) {
    throw NextResponse.json(
      { error: `Feature "${featureKey}" is not enabled` },
      { status: 403 }
    );
  }
}

/**
 * Extract user context for audit logging.
 */
export function getUserContext(user: AuthUser) {
  return {
    uid: user.uid,
    email: user.email || undefined,
    displayName: user.displayName || undefined,
    role: user.role || undefined,
  };
}

/**
 * Standard error response wrapper.
 */
export function errorResponse(message: string, status: number = 500) {
  throw NextResponse.json({ error: message }, { status });
}

/**
 * Standard success response.
 */
export function successResponse(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}
