import { NextRequest, NextResponse } from 'next/server';
import { createAuthUser, deleteAuthUser, authEmailExists } from '@/lib/supabase/auth-admin';
import {
  createOrganization,
  deleteOrganizationWithData,
  subdomainExists,
} from '@/lib/db/organizations';
import { createSubscription } from '@/lib/db/subscriptions';
import { createUser, deleteUser } from '@/lib/db/users';
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

  // --- Compensating cleanup state ---
  // Track which resources were created so we can undo them on failure.
  let organizationId: string | null = null;
  let userCreated = false;

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

    await createUser(newUser.uid, {
      organizationId,
      email,
      displayName,
      role: 'org_owner',
      status: 'active',
      createdBy: newUser.uid,
      updatedBy: newUser.uid,
    });
    userCreated = true;

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
  } catch (e) {
    // --- Compensating cleanup: undo resources in reverse order ---
    // Best-effort: individual cleanup failures are logged but do not mask
    // the original error.
    if (userCreated) {
      await deleteUser(newUser.uid).catch((cleanupErr) =>
        console.error('[self-serve cleanup] failed to delete user record:', cleanupErr),
      );
    }
    if (organizationId) {
      await deleteOrganizationWithData(organizationId).catch((cleanupErr) =>
        console.error('[self-serve cleanup] failed to delete organization:', cleanupErr),
      );
    }
    // Always attempt to delete the auth user — it is the most dangerous
    // orphan because it blocks re-registration with the same email.
    await deleteAuthUser(newUser.uid);
    throw e;
  }

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
