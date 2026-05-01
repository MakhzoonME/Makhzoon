/**
 * Safe error logging that suppresses details in production.
 * In development, logs full error for debugging.
 * In production, logs sanitized error ID only.
 */

import { randomUUID } from 'crypto';

export function logError(context: string, error: unknown): string {
  const errorId = randomUUID();

  if (process.env.NODE_ENV === 'development') {
    // Development: Log full details for debugging
    if (error instanceof Error) {
      console.error(`[${context}] Error ${errorId}:`, error.message);
      console.error(error.stack);
    } else {
      console.error(`[${context}] Error ${errorId}:`, error);
    }
  } else {
    // Production: Log only sanitized error ID and basic context
    // The error will be captured by Sentry separately
    console.error(`[${context}] Error occurred (ID: ${errorId})`);
  }

  return errorId;
}

/**
 * Get error message to return to client.
 * Never returns stack traces or internal details.
 */
export function getClientErrorMessage(error: unknown, defaultMessage = 'An error occurred'): string {
  // Don't expose any error details to client
  if (error instanceof Error && error.message.includes('Unauthorized')) {
    return 'Unauthorized';
  }
  if (error instanceof Error && error.message.includes('Forbidden')) {
    return 'Forbidden';
  }
  if (error instanceof Error && error.message.includes('Not found')) {
    return 'Not found';
  }
  // Default safe message
  return defaultMessage;
}
