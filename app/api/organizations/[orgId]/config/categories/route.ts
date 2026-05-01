import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { addCategory } from '@/lib/db/organization-configs';
import { getOrganizationById } from '@/lib/db/organizations';
import { categoryInputSchema } from '@/lib/validations/organization-config.schema';
import { writeAuditLog } from '@/lib/audit/logger';

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const org = await getOrganizationById(params.orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await req.json();
    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    try {
      const { category, categories } = await addCategory(params.orgId, parsed.data, user.uid);
      await writeAuditLog({
        organizationId: params.orgId,
        userId: user.uid,
        role: user.role,
        action: 'CONFIG_CATEGORY_CREATED',
        module: 'organizationConfig',
        recordId: category.id,
        newValue: { ...category },
      });
      return NextResponse.json({ category, categories }, { status: 201 });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'duplicate') return NextResponse.json({ error: (err as Error).message }, { status: 409 });
      throw err;
    }
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/config/categories]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
