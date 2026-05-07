import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { invalidateCachedSession } from '@/lib/firebase/session-cache';
import { revokeSession } from '@/lib/firebase/session-revocation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

async function verifyWithRetry(idToken: string, attempt = 0) {
  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch (err) {
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return verifyWithRetry(idToken, 1);
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limit session creation (5 per IP per 15 minutes)
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit(
      `session:${clientIp}`,
      5,
      15 * 60 * 1000,
      { action: 'sign in' }
    );
    if (rateLimitResult) return rateLimitResult;

    const body = await req.json();
    const { idToken, turnstileToken: _turnstileToken } = body; // _turnstileToken reserved for Turnstile re-enable
    if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    // TODO: Cloudflare Turnstile bot protection is not yet enabled.
    // To enable: set CLOUDFLARE_TURNSTILE_SECRET_KEY env var, uncomment block below, and ensure _turnstileToken is provided from client
    // const turnstileSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    // if (turnstileSecret && process.env.NODE_ENV === 'production') {
    //   if (!_turnstileToken) {
    //     return NextResponse.json({ error: 'Bot verification failed' }, { status: 400 });
    //   }
    //   const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ secret: turnstileSecret, response: _turnstileToken }),
    //   });
    //   const verifyData = await verifyRes.json();
    //   if (!verifyData.success) {
    //     return NextResponse.json({ error: 'Bot verification failed' }, { status: 400 });
    //   }
    // }

    let decoded;
    try {
      decoded = await verifyWithRetry(idToken);
    } catch (verifyErr) {
      const msg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
      const code = (verifyErr as Record<string, unknown>)?.code;
      console.error('Session: verifyIdToken failed', { code, msg });
      return NextResponse.json({ error: 'Unauthorized', detail: `verifyIdToken: ${code ?? msg}` }, { status: 401 });
    }

    if (!decoded.role) {
      return NextResponse.json({ error: 'No account found' }, { status: 403 });
    }

    // 24-hour session (reduced from 5 days for better security)
    const expiresIn = 60 * 60 * 24 * 1 * 1000; // 1 day
    let sessionCookie;
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    } catch (cookieErr) {
      const msg = cookieErr instanceof Error ? cookieErr.message : String(cookieErr);
      const code = (cookieErr as Record<string, unknown>)?.code;
      console.error('Session: createSessionCookie failed', { code, msg });
      return NextResponse.json({ error: 'Unauthorized', detail: `createSessionCookie: ${code ?? msg}` }, { status: 401 });
    }

    const cookieStore = await cookies();
    // Set secure flag in all non-development environments
    const isSecure = process.env.NODE_ENV !== 'development';
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: isSecure,
      path: '/',
      sameSite: 'strict',
    });

    let orgSlug: string | null = null;
    let features: Record<string, boolean> = {};
    let orgSuspended = false;
    const orgId = decoded.organizationId as string | undefined;
    if (orgId) {
      const [orgDoc, subscription] = await Promise.all([
        adminDb.collection('organizations').doc(orgId).get(),
        getSubscriptionByOrg(orgId),
      ]);
      if (orgDoc.exists) orgSlug = (orgDoc.data()?.subdomain as string) ?? null;
      if (subscription?.features) features = subscription.features as Record<string, boolean>;
      if (subscription?.status === 'SUSPENDED' && decoded.role !== 'super_admin') {
        orgSuspended = true;
      }
    }

    if (orgSuspended) {
      return NextResponse.json(
        { error: 'Organization suspended', orgSuspended: true },
        { status: 403 }
      );
    }

    let permissions = null;
    if (decoded.role === 'staff' && orgId) {
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
      permissions = userDoc.exists ? (userDoc.data()?.permissions ?? null) : null;
    }

    return NextResponse.json(
      { role: decoded.role ?? 'staff', orgSlug, features, permissions },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errCode = (err as Record<string, unknown>)?.code;
    console.error('Session creation error:', { message: errMsg, code: errCode, stack: err instanceof Error ? err.stack : undefined });
    return NextResponse.json({ error: 'Unauthorized', detail: errMsg }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  // Clear cookies immediately (flags must match original set call)
  const isSecure = process.env.NODE_ENV !== 'development';
  cookieStore.set('session', '', { maxAge: 0, path: '/', httpOnly: true, secure: isSecure, sameSite: 'strict' });
  cookieStore.set('transferOrgId', '', { maxAge: 0, path: '/', httpOnly: true, secure: isSecure, sameSite: 'strict' });

  // Revoke the session token server-side so it can't be reused
  if (sessionToken) {
    invalidateCachedSession(sessionToken);
    try {
      // Decode token to get userId for audit purposes
      const decoded = await adminAuth.verifySessionCookie(sessionToken, false).catch(() => null);
      const userId = decoded?.uid;
      if (userId) {
        // Token expires in 1 day (matches session duration)
        const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 1000);
        await revokeSession(sessionToken, userId, expiresAt);
      }
    } catch {
      // If we can't decode, still clear the cookie
    }
  }

  return NextResponse.json({ success: true });
}
