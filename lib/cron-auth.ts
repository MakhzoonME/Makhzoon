import { timingSafeEqual } from 'crypto';

/**
 * Constant-time comparison of the cron bearer token against CRON_SECRET
 * (audit finding S10). A plain `!==` short-circuits on the first differing
 * byte, leaking timing information; timingSafeEqual does not.
 */
export function checkCronSecret(provided: string | null | undefined): boolean {
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
