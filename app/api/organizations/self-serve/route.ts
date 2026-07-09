import { NextRequest, NextResponse } from 'next/server';
import { createAuthUser, deleteAuthUser, authEmailExists } from '@/lib/supabase/auth-admin';
import { createOrganization, subdomainExists } from '@/lib/db/organizations';
import { createSubscription } from '@/lib/db/subscriptions';
import { createUser } from '@/lib/db/users';
import { selfServeSignupSchema } from '@/lib/validations/signup.schema';
import { queueAuditLog } from '@/lib/audit/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const TRIAL_DAYS = 14;

export async function POST(req: NextRequest) {
  // SECURITY: Rate limit signup (3 orgs per IP per 24 hours)
  const clientIp = getClientIp(req);
  const rateLimitResult = await checkRateLimit(
    `signup:${clientIp}`,
    3,
    24 * 60 * 60 * 1000,
    { action: 'create new organizations' }
  );
  if (rateLimitResult) return rateLimitResult;

  const body = await req.json().catch(() => null);
  const parsed = selfServeSignupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { orgName, subdomain, displayName, email, password } = parsed.data;
  const normalizedSub = subdomain.toLowerCase();

  if (await authEmailExists(email)) {
    return NextResponse.json({ error: 'An account already exists for this email' }, { status: 409 });
  }

  if (await subdomainExists(normalizedSub)) {
    return NextResponse.json({ error: 'That workspace ID is already taken' }, { status: 409 });
  }

  // Create the auth identity first; org id is resolved from public.users by
  // verifySessionCookie (authoritative), so app_metadata.organization_id is
  // not required at creation time.
  const newUser = await createAuthUser({
    email,
    password,
    displayName,
    role: 'org_owner',
    organizationId: null,
  });

  let organizationId = '';
  try {
    organizationId = await createOrganization({
      name: orgName,
      subdomain: normalizedSub,
      contactEmail: email,
      description: null,
      category: null,
      packageDetails: 'trial',
      assignedMemberId: null,
      createdBy: newUser.uid,
      updatedBy: newUser.uid,
    });
  } catch (e) {
    await deleteAuthUser(newUser.uid);
    throw e;
  }

  await createUser(newUser.uid, {
    organizationId,
    email,
    displayName,
    role: 'org_owner',
    status: 'active',
    createdBy: newUser.uid,
    updatedBy: newUser.uid,
  });

  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await createSubscription({
    organizationId,
    packageId: null,
    features: {
      dashboard: true,
      assets: true,
      inventory: true,
      requests: true,
      support: true,
      auditLogs: true,
      reports: true,
      pos: false,
      banna: false,
    },
    notes: null,
    packageDetails: { tier: 'trial', trialDays: TRIAL_DAYS },
    startDate: now,
    endDate: trialEnd,
    status: 'ACTIVE',
    createdBy: newUser.uid,
    updatedBy: newUser.uid,
  });

  queueAuditLog({
    organizationId,
    userId: newUser.uid,
    role: 'org_owner',
    action: 'ORGANIZATION_SELF_SERVE_CREATED',
    module: 'organizations',
    recordId: organizationId,
    newValue: { orgName, subdomain: normalizedSub, email },
  });

  return NextResponse.json({ organizationId, userId: newUser.uid }, { status: 201 });
}
