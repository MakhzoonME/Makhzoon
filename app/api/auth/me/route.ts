import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getSubscriptionByOrg } from '@/lib/firestore/subscriptions';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let features: Record<string, boolean> = {};
    let orgSlug: string | null = null;

    if (user.organizationId) {
      const [sub, orgDoc] = await Promise.all([
        getSubscriptionByOrg(user.organizationId),
        adminDb.collection('organizations').doc(user.organizationId).get(),
      ]);
      if (sub?.features) features = sub.features as Record<string, boolean>;
      if (orgDoc.exists) orgSlug = (orgDoc.data()?.subdomain as string) ?? null;
    }

    return NextResponse.json(
      {
        uid: user.uid,
        role: user.role,
        organizationId: user.organizationId,
        orgSlug,
        permissions: user.permissions ?? null,
        features,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
