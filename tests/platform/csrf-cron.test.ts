import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { checkOrigin } from '@/lib/csrf';
import { checkCronSecret } from '@/lib/cron-auth';

function reqWithOrigin(origin: string | null): NextRequest {
  const headers = new Headers();
  if (origin !== null) headers.set('origin', origin);
  return new NextRequest('https://app.makhzoon.me/api/x', { headers });
}

describe('checkOrigin', () => {
  it('allows a request with no Origin header (non-browser client)', () => {
    expect(checkOrigin(reqWithOrigin(null))).toBeNull();
  });

  it('allows explicit first-party origins', () => {
    expect(checkOrigin(reqWithOrigin('https://app.makhzoon.me'))).toBeNull();
    expect(checkOrigin(reqWithOrigin('https://www.makhzoon.me'))).toBeNull();
    expect(checkOrigin(reqWithOrigin('https://rcpt-app.makhzoon.me'))).toBeNull();
  });

  it('rejects an untrusted *.makhzoon.me subdomain (no wildcard trust)', () => {
    const res = checkOrigin(reqWithOrigin('https://evil.makhzoon.me'));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('rejects a foreign origin', () => {
    const res = checkOrigin(reqWithOrigin('https://attacker.example'));
    expect(res!.status).toBe(403);
  });
});

describe('checkCronSecret', () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => { process.env.CRON_SECRET = 'super-secret-value'; });
  afterEach(() => { process.env.CRON_SECRET = original; });

  it('accepts the exact secret', () => {
    expect(checkCronSecret('super-secret-value')).toBe(true);
  });

  it('rejects a wrong secret', () => {
    expect(checkCronSecret('nope')).toBe(false);
  });

  it('rejects a wrong-length secret without throwing', () => {
    expect(checkCronSecret('super-secret-value-extra')).toBe(false);
  });

  it('rejects null/empty and when CRON_SECRET is unset', () => {
    expect(checkCronSecret(null)).toBe(false);
    expect(checkCronSecret('')).toBe(false);
    vi.stubEnv('CRON_SECRET', '');
    expect(checkCronSecret('anything')).toBe(false);
    vi.unstubAllEnvs();
  });
});
