import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const rpcMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ rpc: rpcMock }),
  supabaseAdmin: { rpc: rpcMock },
}));

import { checkRateLimit, rateLimitTenant, getClientIp } from '@/lib/rate-limit';

function rpcAllows(count: number, limit: number) {
  rpcMock.mockResolvedValueOnce({
    data: [
      {
        allowed: count <= limit,
        current_count: count,
        reset_at: new Date(Date.now() + 60_000).toISOString(),
      },
    ],
    error: null,
  });
}

let seq = 0;
function freshKey() {
  return `test:${Date.now()}:${seq++}`;
}

beforeEach(() => {
  rpcMock.mockReset();
});

describe('checkRateLimit (durable)', () => {
  it('allows requests under the limit', async () => {
    const key = freshKey();
    rpcAllows(1, 5);
    const res = await checkRateLimit(key, 5, 60_000);
    expect(res).toBeNull();
    expect(rpcMock).toHaveBeenCalledWith('increment_rate_limit', {
      p_key: key,
      p_limit: 5,
      p_window_ms: 60_000,
    });
  });

  it('returns 429 with Retry-After when the durable counter exceeds the limit', async () => {
    const key = freshKey();
    rpcAllows(6, 5);
    const res = await checkRateLimit(key, 5, 60_000, { action: 'sign in' });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get('Retry-After')).toBeTruthy();
    const body = (await res!.json()) as { error: string };
    expect(body.error).toContain('sign in');
  });

  it('rejects from the local counter without a DB call once this isolate alone exceeds the limit', async () => {
    const key = freshKey();
    const limit = 3;
    for (let i = 1; i <= limit; i++) {
      rpcAllows(i, limit);
      expect(await checkRateLimit(key, limit, 60_000)).toBeNull();
    }
    const callsBefore = rpcMock.mock.calls.length;
    const res = await checkRateLimit(key, limit, 60_000);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(rpcMock.mock.calls.length).toBe(callsBefore); // no extra DB round-trip
  });

  it('fails open (per-isolate fallback) when the durable store errors', async () => {
    const key = freshKey();
    rpcMock.mockResolvedValueOnce({ data: null, error: new Error('db down') });
    const res = await checkRateLimit(key, 5, 60_000);
    expect(res).toBeNull();
  });
});

describe('rateLimitTenant', () => {
  it('keys by org + user + route', async () => {
    rpcAllows(1, 60);
    const res = await rateLimitTenant(
      { organizationId: 'org-1', userId: 'user-1' },
      'assets',
    );
    expect(res).toBeNull();
    expect(rpcMock).toHaveBeenCalledWith(
      'increment_rate_limit',
      expect.objectContaining({ p_key: 'tenant:org-1:user-1:assets' }),
    );
  });
});

describe('getClientIp', () => {
  it('takes the first x-forwarded-for entry', () => {
    const req = new Request('https://x.test', {
      headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip then unknown', () => {
    expect(getClientIp(new Request('https://x.test', { headers: { 'x-real-ip': '9.9.9.9' } }))).toBe('9.9.9.9');
    expect(getClientIp(new Request('https://x.test'))).toBe('unknown');
  });
});
