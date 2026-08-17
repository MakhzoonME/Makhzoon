import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getSubscriptionByOrg, createSubscription } from '@/lib/db/subscriptions';
import { getPackageById } from '@/lib/db/packages';
import { EMPTY_ADD_ONS } from '@/types';
import { queueAuditLog } from '@/lib/audit/logger';

const createSchema = z.object({
  packageId: z.string().min(1),
  startDate: z.union([z.string().datetime(), z.string().date(), z.date()]).optional(),
  trialDays: z.number().int().min(0).optional(),
});

/** For orgs with no subscription row yet — GET on the base route 404s today with nothing the UI can do about it. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const existing = await getSubscriptionByOrg(orgId);
    if (existing) return NextResponse.json({ error: 'Organization already has a subscription' }, { status: 409 });

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const pkg = await getPackageById(parsed.data.packageId);
    if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

    const start = parsed.data.startDate ? new Date(parsed.data.startDate) : new Date();
    const trialDays = parsed.data.trialDays ?? pkg.trialDays ?? 0;
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(trialDays, 30));

    const id = await createSubscription({
      organizationId: orgId,
      packageId: pkg.id,
      features: pkg.features,
      notes: null,
      packageDetails: {},
      startDate: start,
      endDate: end,
      status: 'ACTIVE',
      activeAddOns: EMPTY_ADD_ONS,
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'SUBSCRIPTION_CREATED',
      module: 'subscriptions',
      recordId: id,
      newValue: { packageId: pkg.id, startDate: start, endDate: end },
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/subscription/create]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
