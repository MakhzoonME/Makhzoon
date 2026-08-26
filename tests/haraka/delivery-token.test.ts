import { describe, it, expect } from 'vitest';

/**
 * Unit coverage for the delivery-token freshness rule used by the
 * generate/return endpoint (T1.5). Kept as a pure predicate so the branch
 * logic is testable without standing up Supabase.
 */
function needsNewToken(order: {
  delivery_token: string | null;
  delivery_token_expires_at: string | null;
  delivery_token_revoked_at: string | null;
}, now: number): boolean {
  const token = order.delivery_token;
  const revoked = !!order.delivery_token_revoked_at;
  const expired =
    !order.delivery_token_expires_at ||
    new Date(order.delivery_token_expires_at).getTime() <= now;
  return !token || revoked || expired;
}

const NOW = Date.parse('2026-07-09T12:00:00Z');
const FUTURE = new Date(NOW + 60_000).toISOString();
const PAST = new Date(NOW - 60_000).toISOString();

describe('delivery-token freshness', () => {
  it('mints a token when none exists', () => {
    expect(needsNewToken({ delivery_token: null, delivery_token_expires_at: null, delivery_token_revoked_at: null }, NOW)).toBe(true);
  });

  it('reuses a valid, unexpired, unrevoked token', () => {
    expect(needsNewToken({ delivery_token: 'abc', delivery_token_expires_at: FUTURE, delivery_token_revoked_at: null }, NOW)).toBe(false);
  });

  it('replaces an expired token', () => {
    expect(needsNewToken({ delivery_token: 'abc', delivery_token_expires_at: PAST, delivery_token_revoked_at: null }, NOW)).toBe(true);
  });

  it('replaces a revoked token even if not yet expired', () => {
    expect(needsNewToken({ delivery_token: 'abc', delivery_token_expires_at: FUTURE, delivery_token_revoked_at: PAST }, NOW)).toBe(true);
  });

  it('replaces a token with no expiry recorded', () => {
    expect(needsNewToken({ delivery_token: 'abc', delivery_token_expires_at: null, delivery_token_revoked_at: null }, NOW)).toBe(true);
  });
});
