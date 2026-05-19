// Short-lived server-side cache so we don't hit Supabase Auth / the users
// table on every request. TTLs intentionally short so role/permission changes
// take effect quickly. Drop-in analog of lib/firebase/session-cache.ts.

import type { AuthUser } from '@/types';
import type { UserPermissions } from '@/types/user-permissions.types';

interface SessionCacheEntry {
  user: AuthUser;
  expiresAt: number;
}
interface PermissionsCacheEntry {
  permissions: UserPermissions | null;
  expiresAt: number;
}

const SESSION_TTL = 5_000; // 5s
const PERMISSIONS_TTL = 10_000; // 10s

const cache = new Map<string, SessionCacheEntry>();
const permissionsCache = new Map<string, PermissionsCacheEntry>();

export function getCachedSession(token: string): AuthUser | null {
  const entry = cache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(token);
    return null;
  }
  return entry.user;
}

export function setCachedSession(token: string, user: AuthUser): void {
  if (cache.size > 5000) {
    const now = Date.now();
    Array.from(cache.entries()).forEach(([k, v]) => {
      if (now > v.expiresAt) cache.delete(k);
    });
  }
  cache.set(token, { user, expiresAt: Date.now() + SESSION_TTL });
}

export function invalidateCachedSession(token: string): void {
  cache.delete(token);
}

export function getCachedPermissions(
  uid: string,
): UserPermissions | null | undefined {
  const entry = permissionsCache.get(uid);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    permissionsCache.delete(uid);
    return undefined;
  }
  return entry.permissions;
}

export function setCachedPermissions(
  uid: string,
  permissions: UserPermissions | null,
): void {
  permissionsCache.set(uid, {
    permissions,
    expiresAt: Date.now() + PERMISSIONS_TTL,
  });
}

export function invalidateCachedPermissions(uid: string): void {
  permissionsCache.delete(uid);
}

export function invalidateCachedSessionsForUser(uid: string): void {
  for (const [token, entry] of cache.entries()) {
    if (entry.user.uid === uid) cache.delete(token);
  }
}
