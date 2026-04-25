import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { createOrganization, subdomainExists } from '@/lib/firestore/organizations';
import { createSubscription } from '@/lib/firestore/subscriptions';
import { createUser } from '@/lib/firestore/users';
import { selfServeSignupSchema } from '@/lib/validations/signup.schema';
import { writeAuditLog } from '@/lib/audit/logger';

const TRIAL_DAYS = 14;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = selfServeSignupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { orgName, subdomain, displayName, email, password } = parsed.data;
  const normalizedSub = subdomain.toLowerCase();

  const existingAuth = await adminAuth.getUserByEmail(email).catch(() => null);
  if (existingAuth) return NextResponse.json({ error: 'An account already exists for this email' }, { status: 409 });

  if (await subdomainExists(normalizedSub)) {
    return NextResponse.json({ error: 'That subdomain is already taken' }, { status: 409 });
  }

  const newUser = await adminAuth.createUser({
    email,
    displayName,
    password,
    emailVerified: false,
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
      createdBy: newUser.uid,
      updatedBy: newUser.uid,
    });
  } catch (e) {
    await adminAuth.deleteUser(newUser.uid).catch(() => undefined);
    throw e;
  }

  await adminAuth.setCustomUserClaims(newUser.uid, {
    role: 'admin',
    organizationId,
  });

  await createUser(newUser.uid, {
    organizationId,
    email,
    displayName,
    role: 'admin',
    status: 'active',
    createdBy: newUser.uid,
    updatedBy: newUser.uid,
  });

  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await createSubscription({
    organizationId,
    packageId: null,
    features: {},
    notes: null,
    packageDetails: { tier: 'trial', trialDays: TRIAL_DAYS },
    startDate: now,
    endDate: trialEnd,
    status: 'ACTIVE',
    createdBy: newUser.uid,
    updatedBy: newUser.uid,
  });

  await writeAuditLog({
    organizationId,
    userId: newUser.uid,
    role: 'admin',
    action: 'ORGANIZATION_SELF_SERVE_CREATED',
    module: 'organizations',
    recordId: organizationId,
    newValue: { orgName, subdomain: normalizedSub, email },
  });

  return NextResponse.json({ organizationId, userId: newUser.uid }, { status: 201 });
}
