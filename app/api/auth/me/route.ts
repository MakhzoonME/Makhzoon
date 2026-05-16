import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { getOrganizationById } from '@/lib/db/organizations';

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let features: Record<string, boolean> = {};
    let orgSlug: string | null = null;

    if (user.organizationId) {
      const [sub, org] = await Promise.all([
        getSubscriptionByOrg(user.organizationId),
        getOrganizationById(user.organizationId),
      ]);
      if (sub?.features) features = sub.features as Record<string, boolean>;
      orgSlug = org?.subdomain ?? null;
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
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
