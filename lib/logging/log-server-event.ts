import 'server-only';
import { writeBackendLog, type LogLevel } from './backend-logger';

/**
 * Record a server-side event (not tied to an incoming HTTP request) into the
 * system log: cron runs, background jobs, webhook decisions, notable warnings.
 * Stored in backend_logs with method='SYSTEM' and path=<source> so it shows up
 * on the superadmin Backend/System Logs page alongside request logs.
 *
 * Fire-and-forget — never throws.
 */
export function logServerEvent(
  level: LogLevel,
  source: string,
  message: string,
  meta?: {
    userId?: string;
    organizationId?: string;
    organizationName?: string;
    role?: string;
    durationMs?: number;
    detail?: unknown;
  },
): void {
  writeBackendLog({
    timestamp: new Date(),
    method: 'SYSTEM',
    path: source,
    statusCode: 0,
    level,
    durationMs: meta?.durationMs ?? 0,
    userId: meta?.userId,
    organizationId: meta?.organizationId,
    organizationName: meta?.organizationName,
    role: meta?.role,
    errorMessage: level === 'error' ? message : undefined,
    requestSummary: message,
    responseSummary:
      meta?.detail !== undefined
        ? typeof meta.detail === 'string'
          ? meta.detail
          : JSON.stringify(meta.detail)
        : undefined,
  });
}
