import { NextRequest } from 'next/server';
import { writeBackendLog } from './backend-logger';
import type { AuthUser } from '@/types';

/**
 * Call once per route handler after you have the response status.
 * Fire-and-forget — never throws.
 */
export function logRequest(
  req: NextRequest,
  statusCode: number,
  startMs: number,
  user: AuthUser | null,
  extra?: { orgName?: string; errorMessage?: string; requestSummary?: string; responseSummary?: string }
): void {
  const durationMs = Date.now() - startMs;
  const url = new URL(req.url);

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
    userId: user?.uid,
    userDisplayName: user?.displayName || user?.email,
    organizationId: user?.organizationId ?? undefined,
    role: user?.role,
    ...extra,
  });
}
