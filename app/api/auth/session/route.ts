import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

async function verifyWithRetry(idToken: string, attempt = 0) {
  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch (err) {
    // On first cold-start the Admin SDK occasionally rejects a freshly-minted token.
    // Wait 1 s and retry once before giving up.
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return verifyWithRetry(idToken, 1);
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const decoded = await verifyWithRetry(idToken);
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

    // Resolve the org slug so the client can redirect to the correct path
    let orgSlug: string | null = null;
    const orgId = decoded.organizationId as string | undefined;
    if (orgId) {
      const doc = await adminDb.collection('organizations').doc(orgId).get();
      if (doc.exists) orgSlug = (doc.data()?.subdomain as string) ?? null;
    }

    return NextResponse.json({ role: decoded.role ?? 'staff', orgSlug });
  } catch (err) {
    console.error('Session creation error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.set('session', '', { maxAge: 0, path: '/' });
  cookieStore.set('transferOrgId', '', { maxAge: 0, path: '/' });
  return NextResponse.json({ success: true });
}
