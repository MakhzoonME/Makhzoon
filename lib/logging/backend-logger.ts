import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type LogLevel = 'success' | 'warning' | 'error' | 'info';

export interface BackendLogEntry {
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  level: LogLevel;
  durationMs: number;
  userId?: string;
  userDisplayName?: string;
  organizationId?: string;
  organizationName?: string;
  role?: string;
  errorMessage?: string;
  requestSummary?: string;
  responseSummary?: string;
}

function resolveLevel(statusCode: number): LogLevel {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warning';
  if (statusCode >= 200 && statusCode < 300) return 'success';
  return 'info';
}

/**
 * Fire-and-forget — never throws, never blocks the response.
 */
export function writeBackendLog(entry: BackendLogEntry): void {
  const level = entry.level ?? resolveLevel(entry.statusCode);
  supabaseAdmin
    .from('backend_logs')
    .insert({
      method: entry.method,
      path: entry.path,
      status_code: entry.statusCode,
      level,
      duration_ms: entry.durationMs,
      user_id: entry.userId ?? null,
      user_display_name: entry.userDisplayName ?? null,
      organization_id: entry.organizationId ?? null,
      organization_name: entry.organizationName ?? null,
      role: entry.role ?? null,
      error_message: entry.errorMessage ?? null,
      request_summary: entry.requestSummary ?? null,
      response_summary: entry.responseSummary ?? null,
    })
    .then(() => {
      // Logging must never crash the request
    });
}

/**
 * Wraps a Next.js App Router handler to automatically log every request.
 * Usage: export const GET = withLogging(async (req) => { ... });
 */
export function withLogging<T extends unknown[]>(
  handler: (req: Request, ...args: T) => Promise<Response>,
  opts?: { path?: string }
): (req: Request, ...args: T) => Promise<Response> {
  return async (req: Request, ...args: T): Promise<Response> => {
    const start = Date.now();
    let response: Response;
    let errorMessage: string | undefined;

    try {
      response = await handler(req, ...args);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unhandled exception';
      response = new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const durationMs = Date.now() - start;
    const url = new URL(req.url);
    const path = opts?.path ?? url.pathname;
    const statusCode = response.status;

    writeBackendLog({
      timestamp: new Date(),
      method: req.method,
      path,
      statusCode,
      level: resolveLevel(statusCode),
      durationMs,
      errorMessage,
    });

    return response;
  };
}
