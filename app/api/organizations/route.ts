import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import {
  getOrganizationsWithSearch,
  createOrganization,
  subdomainExists,
} from '@/lib/db/organizations';
import { createSubscription } from '@/lib/db/subscriptions';
import { createInvite, generateInviteToken } from '@/lib/db/invites';
import { writeAuditLog } from '@/lib/audit/logger';
import { organizationSchema } from '@/lib/validations/organization.schema';
import { sendEmail } from '@/lib/email/resend';
import { inviteEmail } from '@/lib/email/templates';


export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const category = searchParams.get('category') ?? undefined;

    const orgs = await getOrganizationsWithSearch({ search, category });
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
      description: data.description ?? null,
      category: data.category ?? null,
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

    // Auto-invite the contact email as Owner
    if (data.contactEmail) {
      try {
        const token = generateInviteToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day invite for owner
        const inviteId = await createInvite({
          organizationId: orgId,
          email: data.contactEmail,
          displayName: data.name + ' Owner',
          role: 'org_owner',
          token,
          invitedBy: user.uid,
          invitedByEmail: user.email,
          invitedByName: user.displayName || 'Makhzoon',
          expiresAt,
          permissions: null,
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin;
        const acceptUrl = `${baseUrl}/invites/${token}`;

        const { html, text } = inviteEmail({
          orgName: data.name,
          inviterName: 'Makhzoon',
          acceptUrl,
          role: 'org_owner',
        });

        await sendEmail({
          to: data.contactEmail,
          subject: `You've been invited as Owner of ${data.name} on Makhzoon`,
          html,
          text,
        }).catch((err) => {
          if (process.env.NODE_ENV !== 'production') console.warn('[org-create] Owner invite email failed:', err);
        });

        await writeAuditLog({
          organizationId: orgId,
          userId: user.uid,
          role: user.role,
          action: 'INVITE_SENT',
          module: 'users',
          recordId: inviteId,
          newValue: { email: data.contactEmail, role: 'org_owner' },
        });
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.warn('[org-create] Failed to create owner invite:', err);
      }
    }

    return NextResponse.json({ id: orgId }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/organizations]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
