import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { updateCategory, deleteCategory } from '@/lib/firestore/organization-configs';
import { getOrganizationById } from '@/lib/firestore/organizations';
import { categoryPatchSchema } from '@/lib/validations/organization-config.schema';
import { writeAuditLog } from '@/lib/audit/logger';

interface Params { params: { orgId: string; categoryId: string } }

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const org = await getOrganizationById(params.orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await req.json();
    const parsed = categoryPatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    try {
      const { category, categories } = await updateCategory(params.orgId, params.categoryId, parsed.data, user.uid);
      if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      await writeAuditLog({
        organizationId: params.orgId,
        userId: user.uid,
        role: user.role,
        action: 'CONFIG_CATEGORY_UPDATED',
        module: 'organizationConfig',
        recordId: params.categoryId,
        newValue: parsed.data as Record<string, unknown>,
      });
      return NextResponse.json({ category, categories });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'duplicate') return NextResponse.json({ error: (err as Error).message }, { status: 409 });
      throw err;
    }
  } catch (err) {
    console.error('[PUT /api/organizations/[orgId]/config/categories/[categoryId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const org = await getOrganizationById(params.orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    try {
      const { removed, categories } = await deleteCategory(params.orgId, params.categoryId, user.uid);
      if (!removed) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      await writeAuditLog({
        organizationId: params.orgId,
        userId: user.uid,
        role: user.role,
        action: 'CONFIG_CATEGORY_DELETED',
        module: 'organizationConfig',
        recordId: params.categoryId,
        oldValue: removed as unknown as Record<string, unknown>,
      });
      return NextResponse.json({ success: true, categories });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'min_required') return NextResponse.json({ error: (err as Error).message }, { status: 400 });
      throw err;
    }
  } catch (err) {
    console.error('[DELETE /api/organizations/[orgId]/config/categories/[categoryId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
