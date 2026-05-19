import { timingSafeEqual } from 'crypto';

/**
 * Constant-time validation of the cron `Authorization: Bearer <CRON_SECRET>`
 * header. Avoids the character-by-character timing oracle that `!==` exposes
 * (HIGH-2). Returns false (fail-closed) when the secret is unset.
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided =
    req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
