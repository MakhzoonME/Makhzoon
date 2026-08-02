/**
 * Next.js instrumentation. `onRequestError` fires for every uncaught error in
 * any route handler, server component, or server action — a single global hook
 * that records server-side errors into the system log with no per-route wiring.
 */
import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  // Only the Node.js runtime can reach the service-role client used by the
  // logger; skip on the edge runtime.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { writeBackendLog } = await import('@/lib/logging/backend-logger');
    const message = err instanceof Error ? err.message : String(err);
    writeBackendLog({
      timestamp: new Date(),
      method: request.method ?? 'UNKNOWN',
      path: request.path ?? context.routePath ?? 'unknown',
      statusCode: 500,
      level: 'error',
      durationMs: 0,
      errorMessage: message,
      requestSummary: `Uncaught ${context.routerKind}/${context.routeType} error @ ${context.routePath ?? request.path}`,
      responseSummary: err instanceof Error && err.stack ? err.stack.split('\n').slice(0, 6).join('\n') : undefined,
    });
  } catch {
    // Never let error logging throw.
  }
};
