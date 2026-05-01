import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { invalidateCachedSession } from '@/lib/firebase/session-cache';

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

    const decoded = await verifyWithRetry(idToken);

    if (!decoded.role) {
      return NextResponse.json({ error: 'No account found' }, { status: 403 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    let orgSlug: string | null = null;
    let features: Record<string, boolean> = {};
    const orgId = decoded.organizationId as string | undefined;
    if (orgId) {
      const [orgDoc, subscription] = await Promise.all([
        adminDb.collection('organizations').doc(orgId).get(),
        getSubscriptionByOrg(orgId),
      ]);
      if (orgDoc.exists) orgSlug = (orgDoc.data()?.subdomain as string) ?? null;
      if (subscription?.features) features = subscription.features as Record<string, boolean>;
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
    console.error('Session creation error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;

  cookieStore.set('session', '', { maxAge: 0, path: '/' });
  cookieStore.set('transferOrgId', '', { maxAge: 0, path: '/' });

  if (sessionToken) {
    invalidateCachedSession(sessionToken);
  }

  return NextResponse.json({ success: true });
}
