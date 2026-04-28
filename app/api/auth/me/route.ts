import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getSubscriptionByOrg } from '@/lib/firestore/subscriptions';

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let features: Record<string, boolean> = {};
    if (user.organizationId) {
      const sub = await getSubscriptionByOrg(user.organizationId);
      if (sub?.features) features = sub.features as Record<string, boolean>;
    }

    return NextResponse.json(
      {
        uid: user.uid,
        role: user.role,
        organizationId: user.organizationId,
        permissions: user.permissions ?? null,
        features,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
