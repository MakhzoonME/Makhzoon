// Cache decoded session tokens for 60s to avoid repeated Firebase Auth calls.
// Safe because session cookies are rotated on sign-out, and 60s staleness is acceptable.

import type { DecodedIdToken } from 'firebase-admin/auth';

interface CacheEntry {
  decoded: DecodedIdToken;
  expiresAt: number;
}

const TTL = 60_000; // 60 seconds
const cache = new Map<string, CacheEntry>();

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
  // Evict stale entries periodically to avoid memory leaks
  if (cache.size > 5000) {
    const now = Date.now();
    Array.from(cache.entries()).forEach(([k, v]) => {
      if (now > v.expiresAt) cache.delete(k);
    });
  }
  cache.set(token, { decoded, expiresAt: Date.now() + TTL });
}

export function invalidateCachedSession(token: string): void {
  cache.delete(token);
}
