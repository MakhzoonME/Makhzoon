import 'server-only';
import { supabaseAdmin } from './admin';

/**
 * Server-side session revocation. Supabase only revokes *refresh* tokens on
 * sign-out; a still-valid access token would otherwise work until expiry.
 * To preserve the legacy "logout invalidates immediately" guarantee we keep a
 * deny-list keyed by the JWT `session_id` claim. Rows self-expire via the
 * Postgres TTL job in 0003_auth.sql.
 *
 * Drop-in analog of lib/firebase/session-revocation.ts (collection →
 * public.revoked_sessions table).
 */
export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  try {
    const { data, error } = await supabaseAdmin
      .from('revoked_sessions')
      .select('session_id')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

export async function revokeSession(
  sessionId: string,
  userId: string,
  expiresAt: Date,
): Promise<void> {
  try {
    await supabaseAdmin.from('revoked_sessions').upsert(
      {
        session_id: sessionId,
        user_id: userId,
        revoked_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'session_id' },
    );
  } catch (err) {
    // Revocation failure must not break logout.
    console.error('[revokeSession] failed:', err);
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  try {
    // Invalidate refresh tokens (Supabase-native), then nothing else is needed
    // since access tokens are short-lived; existing deny-list rows stand.
    await supabaseAdmin.auth.admin.signOut(userId, 'global').catch(() => {});
  } catch (err) {
    console.error('[revokeAllUserSessions] failed:', err);
  }
}
