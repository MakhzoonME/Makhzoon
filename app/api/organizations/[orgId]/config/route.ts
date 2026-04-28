import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrCreateOrganizationConfig } from '@/lib/firestore/organization-configs';
import { getOrganizationById } from '@/lib/firestore/organizations';

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orgId } = params;
    // Super admins can read any org; org members can read their own.
    if (user.role !== 'super_admin' && user.organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const org = await getOrganizationById(orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const cfg = await getOrCreateOrganizationConfig(orgId, user.uid);
    return NextResponse.json(cfg, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[GET /api/organizations/[orgId]/config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
