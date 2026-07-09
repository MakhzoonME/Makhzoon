import 'server-only';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Durable rate limiter backed by Postgres (public.rate_limits +
 * increment_rate_limit(), migration 0036).
 *
 * Counters were previously kept in a per-isolate in-memory Map — ineffective
 * on Cloudflare Workers where isolates are ephemeral and numerous. The Map is
 * retained only as (a) a fast-path rejection when this isolate alone has
 * already exceeded the limit (local count is always ≤ the global count), and
 * (b) the fallback when the database is unreachable, so we degrade to
 * per-isolate limiting instead of failing open entirely.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const localStore = new Map<string, RateLimitEntry>();

/** Clean up expired local entries (runs periodically). */
function cleanup() {
  const now = Date.now();
  const entries = Array.from(localStore.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetAt) {
      localStore.delete(key);
    }
  }
}

/** Format time remaining for user display. */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

function bumpLocal(key: string, windowMs: number): RateLimitEntry {
  if (Math.random() < 0.01) cleanup();
  const now = Date.now();
  let entry = localStore.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    localStore.set(key, entry);
  } else {
    entry.count++;
  }
  return entry;
}

function limitResponse(
  limit: number,
  resetAtMs: number,
  options?: { errorMessage?: string; action?: string },
): NextResponse {
  const secondsRemaining = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
  const timeRemaining = formatTimeRemaining(secondsRemaining);

  let message = options?.errorMessage || 'Too many requests.';
  message += ` Please try again in ${timeRemaining}.`;
  if (options?.action) {
    message = `Too many attempts to ${options.action}. Please try again in ${timeRemaining}.`;
  }

  return NextResponse.json(
    {
      error: message,
      retryAfter: secondsRemaining,
    },
    {
      status: 429,
      headers: {
        'Retry-After': secondsRemaining.toString(),
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(resetAtMs).toISOString(),
      },
    },
  );
}

/**
 * Check and enforce rate limit.
 * Returns null if limit not exceeded, or NextResponse with 429 if exceeded.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  options?: {
    errorMessage?: string; // Custom error message
    action?: string; // Action being rate limited (e.g., "sign in", "create account")
  },
): Promise<NextResponse | null> {
  // Fast path: this isolate alone has already exceeded the limit, so the
  // global counter must have too — reject without a DB round-trip.
  const local = bumpLocal(key, windowMs);
  if (local.count > limit) {
    return limitResponse(limit, local.resetAt, options);
  }

  try {
    const { data, error } = await getSupabaseAdmin().rpc('increment_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.allowed === false) {
      return limitResponse(limit, new Date(row.reset_at as string).getTime(), options);
    }
    return null;
  } catch (err) {
    // Durable store unreachable — degrade to the per-isolate counter rather
    // than blocking (or fully opening) the endpoint.
    console.error('[rate-limit] durable check failed, using local fallback:', err);
    return null;
  }
}

/**
 * Get client IP from request.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Per-user rate limit for authenticated, expensive endpoints (reports,
 * inventory/asset lists, transaction queries). Keyed by org + user + a route
 * label so limits don't bleed across endpoints.
 */
export async function rateLimitTenant(
  params: { organizationId: string; userId: string },
  route: string,
  limit = 60,
  windowMs = 60_000,
): Promise<NextResponse | null> {
  const key = `tenant:${params.organizationId}:${params.userId}:${route}`;
  return checkRateLimit(key, limit, windowMs, {
    errorMessage: 'Too many requests for this resource.',
  });
}
