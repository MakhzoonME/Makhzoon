import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// One of: password grant (login) or refresh grant. All input is JSON.
const tokenRequestSchema = z.union([
  z.object({ email: z.string().email(), password: z.string().min(1) }),
  z.object({ refreshToken: z.string().min(1) }),
]);

/**
 * JSON login / refresh endpoint for API clients (Postman, mobile, integrations).
 *
 * Unlike /api/auth/session (which reads the browser session cookie), this route
 * exchanges credentials for a raw Supabase JWT that callers send back as
 * `Authorization: Bearer <accessToken>` on every subsequent request
 * (verifySessionCookie accepts that header). All input and output is JSON — no
 * query string or path parameters.
 *
 * Body — one of:
 *   { "email": "...", "password": "..." }   → password grant (login)
 *   { "refreshToken": "..." }                → refresh grant (keep the session alive)
 *
 * Response:
 *   { accessToken, refreshToken, tokenType: "bearer", expiresAt, expiresIn, user }
 *
 * Token lifetime: the access token's true expiry is governed by the Supabase
 * project's JWT expiry setting (Dashboard → Authentication → Sessions). Set it
 * to 43200 (12h) to have the access token itself live 12 hours; regardless of
 * that value, clients can call this endpoint with `refreshToken` to obtain a
 * fresh token and keep the session alive.
 */
export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rl = await checkRateLimit(`auth-token:${clientIp}`, 10, 15 * 60 * 1000, {
    action: 'sign in',
  });
  if (rl) return rl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Auth is not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const parsed = tokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'email + password, or refreshToken, are required' },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
  } | null = null;
  let user: { id: string; email: string | null } | null = null;

  if ('refreshToken' in input) {
    // ── Refresh grant ──────────────────────────────────────────────
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: input.refreshToken,
    });
    if (error || !data.session) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }
    session = data.session;
    user = data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  } else {
    // ── Password grant (login) ─────────────────────────────────────
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.session) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    session = data.session;
    user = data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  }

  const expiresAt =
    typeof session.expires_at === 'number'
      ? new Date(session.expires_at * 1000).toISOString()
      : null;

  return NextResponse.json({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    tokenType: 'bearer',
    expiresAt,
    expiresIn: session.expires_in ?? null,
    user,
  });
}
