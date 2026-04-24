import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrganizations, createOrganization, subdomainExists } from '@/lib/firestore/organizations';
import { createSubscription } from '@/lib/firestore/subscriptions';
import { writeAuditLog } from '@/lib/audit/logger';
import { organizationSchema } from '@/lib/validations/organization.schema';

export async function GET(_req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgs = await getOrganizations();
    return NextResponse.json(orgs);
  } catch (err) {
    console.error('[GET /api/organizations]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = organizationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const exists = await subdomainExists(data.subdomain);
    if (exists) return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 });

    const orgId = await createOrganization({
      name: data.name,
      subdomain: data.subdomain,
      contactEmail: data.contactEmail,
      packageDetails: data.packageDetails,
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    await createSubscription({
      organizationId: orgId,
      packageId: null,
      features: {},
      notes: data.packageDetails ?? null,
      packageDetails: { notes: data.packageDetails ?? '' },
      startDate: new Date(data.subscriptionStartDate),
      endDate: new Date(data.subscriptionEndDate),
      status: 'ACTIVE',
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'ORGANIZATION_CREATED',
      module: 'organizations',
      recordId: orgId,
      newValue: { name: data.name, subdomain: data.subdomain },
    });

    return NextResponse.json({ id: orgId }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/organizations]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
