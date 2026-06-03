import { NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter with TTL cleanup.
 * For production, use Vercel KV, Redis, or similar.
 *
 * Tracks requests by key (IP, email, etc.) and enforces limits.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries (runs periodically).
 */
function cleanup() {
  const now = Date.now();
  const entries = Array.from(store.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Format time remaining for user display.
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Check and enforce rate limit.
 * Returns null if limit not exceeded, or NextResponse with 429 if exceeded.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  options?: {
    errorMessage?: string; // Custom error message
    action?: string; // Action being rate limited (e.g., "sign in", "create account")
  }
): NextResponse | null {
  // Periodic cleanup
  if (Math.random() < 0.01) cleanup();

  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return null;
  }

  // Existing window
  entry.count++;
  if (entry.count > limit) {
    const secondsRemaining = Math.ceil((entry.resetAt - now) / 1000);
    const timeRemaining = formatTimeRemaining(secondsRemaining);

    // Construct helpful error message
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
          'X-RateLimit-Reset': new Date(entry.resetAt).toISOString(),
        },
      }
    );
  }

  return null;
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
 *
 * NOTE: the underlying store is in-memory and therefore per-isolate on
 * Cloudflare Workers — it throttles bursts within a single isolate but is not a
 * distributed limit. Move `store` to KV/Durable Objects/Redis for hard
 * cross-isolate guarantees.
 */
export function rateLimitTenant(
  params: { organizationId: string; userId: string },
  route: string,
  limit = 60,
  windowMs = 60_000,
): NextResponse | null {
  const key = `tenant:${params.organizationId}:${params.userId}:${route}`;
  return checkRateLimit(key, limit, windowMs, {
    errorMessage: 'Too many requests for this resource.',
  });
}
