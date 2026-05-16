import { NextRequest, NextResponse } from 'next/server';
import { writeBackendLog } from './backend-logger';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';

type RouteContext = { params: Record<string, string> };
type Handler = (req: NextRequest, ctx?: RouteContext) => Promise<NextResponse | Response>;

/**
 * Wrap any App Router route handler to automatically log requests to backendLogs.
 *
 * Usage:
 *   export const GET = withLogging(async (req) => { ... });
 *   export const POST = withLogging(async (req, ctx) => { ... });
 */
export function withLogging(handler: Handler): Handler {
  return async (req: NextRequest, ctx?: RouteContext) => {
    const start = Date.now();
    const url = new URL(req.url);

    let response: Response;
    let errorMessage: string | undefined;

    try {
      response = await handler(req, ctx);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unhandled exception';
      response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const durationMs = Date.now() - start;
    const statusCode = response.status;

    // Read user from the session cookie (hits the 5s in-memory cache — free)
    let userId: string | undefined;
    let displayName: string | undefined;
    let organizationId: string | undefined;
    let role: string | undefined;
    try {
      const user = await verifySessionCookie();
      if (user) {
        userId = user.uid;
        displayName = user.displayName || user.email;
        organizationId = user.organizationId ?? undefined;
        role = user.role;
      }
    } catch {
      // ignore — logging must never crash the request
    }

    let level: 'success' | 'warning' | 'error' | 'info' = 'info';
    if (statusCode >= 500) level = 'error';
    else if (statusCode >= 400) level = 'warning';
    else if (statusCode >= 200 && statusCode < 300) level = 'success';

    writeBackendLog({
      timestamp: new Date(),
      method: req.method,
      path: url.pathname,
      statusCode,
      level,
      durationMs,
      userId,
      userDisplayName: displayName,
      organizationId,
      role,
      errorMessage,
    });

    return response;
  };
}
