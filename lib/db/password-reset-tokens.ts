import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomBytes, createHash } from 'crypto';

export const PASSWORD_RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h

/** Only the SHA256 hash is stored; the plaintext goes to the user by email. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken(uid: string): Promise<string> {
  const plainToken = randomBytes(32).toString('base64url');
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);

  const { error } = await supabaseAdmin.from('password_reset_tokens').upsert(
    {
      hashed_token: hashedToken,
      uid,
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'hashed_token' },
  );
  if (error) throw error;
  return plainToken;
}

/** Verify and consume (one-time) a reset token; returns the uid or null. */
export async function verifyPasswordResetToken(
  plainToken: string,
): Promise<string | null> {
  const hashedToken = hashToken(plainToken);
  const { data } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('uid, expires_at')
    .eq('hashed_token', hashedToken)
    .maybeSingle();

  if (!data) return null;

  const expiresAt = data.expires_at
    ? new Date(data.expires_at as string)
    : new Date(0);

  // One-time use: always delete, whether expired or consumed.
  await supabaseAdmin
    .from('password_reset_tokens')
    .delete()
    .eq('hashed_token', hashedToken);

  if (expiresAt < new Date()) return null;
  return (data.uid as string) ?? null;
}

export async function cleanupExpiredResetTokens(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('password_reset_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('hashed_token');
  if (error) return 0;
  return data?.length ?? 0;
}
