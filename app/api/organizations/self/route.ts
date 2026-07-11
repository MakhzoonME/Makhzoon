import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getOrganizationById, updateOrganization } from '@/lib/db/organizations';
import { getSuperAdminUserById } from '@/lib/db/superadmin-users';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ORG_CATEGORIES } from '@/types';
import { queueAuditLog } from '@/lib/audit/logger';
import { z } from 'zod';

const orgSelfPatchSchema = z.object({
  name: z.string().max(200).optional(),
  contactEmail: z.string().max(254).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
}).passthrough();

/** Legacy PII-scrub pattern from the Firestore clone scripts. No clone exists
 *  post-migration so this never matches, but the fallback is kept harmless. */
const SCRUBBED_ORG_EMAIL = /^org-.+@example\.test$/i;

async function resolveOrgOwnerEmail(orgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('organization_id', orgId)
    .eq('role', 'org_owner')
    .limit(1)
    .maybeSingle();
  return (data?.email as string) ?? null;
}

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin']);
    const isAdmin = ADMIN_ROLES.has(user.role);
    const hasOrgInfoPerm = user.role === 'staff' && user.permissions?.settings?.orgInfo === true;
    if (!isAdmin && !hasOrgInfoPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization associated with this account' }, { status: 403 });

    const org = await getOrganizationById(orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    let contactEmail = org.contactEmail;
    if (contactEmail && SCRUBBED_ORG_EMAIL.test(contactEmail)) {
      const ownerEmail = await resolveOrgOwnerEmail(orgId);
      if (ownerEmail) contactEmail = ownerEmail;
    }

    let accountManager: { id: string; name: string; email: string } | null = null;
    if (org.assignedMemberId) {
      const member = await getSuperAdminUserById(org.assignedMemberId);
      if (member) {
        accountManager = { id: member.id, name: member.displayName ?? '', email: member.email };
      }
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      subdomain: org.subdomain,
      contactEmail,
      description: org.description,
      category: org.category,
      accountManager,
    });
  } catch (err) {
    console.error('[GET /api/organizations/self]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const EDIT_ROLES = new Set(['admin', 'org_owner', 'super_admin']);
    if (!EDIT_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization associated with this account' }, { status: 403 });

    const parsedBody = orgSelfPatchSchema.safeParse(await req.json().catch(() => null));
    if (!parsedBody.success) return NextResponse.json({ error: 'Invalid body', details: parsedBody.error.flatten() }, { status: 422 });
    const body = parsedBody.data;
    const patch: Partial<{ name: string; contactEmail: string; description: string; category: string | null; updatedBy: string }> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 422 });
      patch.name = name;
    }
    if (typeof body.contactEmail === 'string') patch.contactEmail = body.contactEmail.trim() || undefined;
    if (typeof body.description === 'string') patch.description = body.description.trim() || undefined;
    if (typeof body.category === 'string') {
      if (body.category && !(ORG_CATEGORIES as readonly string[]).includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 422 });
      }
      patch.category = body.category || null;
    }

    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 422 });

    await updateOrganization(orgId, { ...patch, updatedBy: user.uid } as Parameters<typeof updateOrganization>[1]);
    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'ORGANIZATION_UPDATED',
      module: 'settings',
      newValue: patch as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/organizations/self]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
