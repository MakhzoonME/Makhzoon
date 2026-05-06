// Short-lived server-side cache to prevent hammering Firebase Auth on every request.
// TTL is intentionally short so role/permission changes take effect quickly.

import type { DecodedIdToken } from 'firebase-admin/auth';
import type { UserPermissions } from '@/types/user-permissions.types';

interface CacheEntry {
  decoded: DecodedIdToken;
  expiresAt: number;
}

interface PermissionsCacheEntry {
  permissions: UserPermissions | null;
  expiresAt: number;
}

const SESSION_TTL = 5_000;     // 5 seconds — keeps Firebase load low without hiding stale state
const PERMISSIONS_TTL = 10_000; // 10 seconds

const cache = new Map<string, CacheEntry>();
const permissionsCache = new Map<string, PermissionsCacheEntry>();

export function getCachedSession(token: string): DecodedIdToken | null {
  const entry = cache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(token);
    return null;
  }
  return entry.decoded;
}

export function setCachedSession(token: string, decoded: DecodedIdToken): void {
  if (cache.size > 5000) {
    const now = Date.now();
    Array.from(cache.entries()).forEach(([k, v]) => {
      if (now > v.expiresAt) cache.delete(k);
    });
  }
  cache.set(token, { decoded, expiresAt: Date.now() + SESSION_TTL });
}

export function invalidateCachedSession(token: string): void {
  cache.delete(token);
}

export function getCachedPermissions(uid: string): UserPermissions | null | undefined {
  const entry = permissionsCache.get(uid);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    permissionsCache.delete(uid);
    return undefined;
  }
  return entry.permissions;
}

export function setCachedPermissions(uid: string, permissions: UserPermissions | null): void {
  permissionsCache.set(uid, { permissions, expiresAt: Date.now() + PERMISSIONS_TTL });
}

export function invalidateCachedPermissions(uid: string): void {
  permissionsCache.delete(uid);
}

/**
 * Invalidate ALL cached sessions for a specific user.
 * Used when a user's role or permissions change so the
 * next request re-verifies the ID token and fetches fresh data.
 */
export function invalidateCachedSessionsForUser(uid: string): void {
  for (const [token, entry] of cache.entries()) {
    if (entry.decoded.uid === uid) {
      cache.delete(token);
    }
  }
}
