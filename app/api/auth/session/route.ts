import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { getAnyPendingInviteByPhone } from '@/lib/firestore/invites';
import { getOrganizationById } from '@/lib/firestore/organizations';
import { getSubscriptionByOrg } from '@/lib/firestore/subscriptions';

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
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const decoded = await verifyWithRetry(idToken);

    // Phone user with no org/role claims — check for a pending invite
    if (!decoded.role && decoded.phone_number) {
      const invite = await getAnyPendingInviteByPhone(decoded.phone_number);
      if (!invite) {
        return NextResponse.json({ error: 'No account found for this phone number' }, { status: 403 });
      }
      const org = await getOrganizationById(invite.organizationId);
      return NextResponse.json({
        needsInviteAccept: true,
        inviteToken: invite.token,
        orgName: org?.name ?? 'your workspace',
        role: invite.role,
        displayName: invite.displayName,
        invitedByName: invite.invitedByName ?? invite.invitedByEmail,
      });
    }

    // Normal sign-in: user has claims
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

    return NextResponse.json({ role: decoded.role ?? 'staff', orgSlug, features });
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
