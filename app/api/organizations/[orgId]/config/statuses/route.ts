import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { addStatus } from '@/lib/db/organization-configs';
import { getOrganizationById } from '@/lib/db/organizations';
import { statusInputSchema } from '@/lib/validations/organization-config.schema';
import { writeAuditLog } from '@/lib/audit/logger';

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = params;
    const org = await getOrganizationById(orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await req.json();
    const parsed = statusInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    try {
      const { status, statuses } = await addStatus(orgId, parsed.data, user.uid);
      await writeAuditLog({
        organizationId: orgId,
        userId: user.uid,
        role: user.role,
        action: 'CONFIG_STATUS_CREATED',
        module: 'organizationConfig',
        recordId: status.id,
        newValue: { ...status },
      });
      return NextResponse.json({ status, statuses }, { status: 201 });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'duplicate') {
        return NextResponse.json({ error: (err as Error).message }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/config/statuses]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
