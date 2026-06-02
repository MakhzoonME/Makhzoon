import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import {
  getPlatformListItems,
  getOrgListItems,
  upsertOrgListItem,
  deleteOrgListItem,
} from '@/lib/db/managed-lists';
import { orgListItemSchema, orgListItemDeleteSchema } from '@/lib/validations/list-item.schema';
import type { ListKey } from '@/types';

const SA_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
const WRITE_ROLES = new Set(['super_admin', 'makhzoon_admin']);

// Returns platform defaults + org-specific overrides for a given org.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SA_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const key = req.nextUrl.searchParams.get('key') as ListKey | null;

    const [platform, org] = await Promise.all([
      getPlatformListItems(key ?? undefined),
      getOrgListItems(orgId, key ?? undefined),
    ]);

    return NextResponse.json({ platform, org }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/superadmin/organizations/[orgId]/lists]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Upsert an org-specific list item for the given org.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!WRITE_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const parsed = orgListItemSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await upsertOrgListItem({
      ...parsed.data,
      listKey: parsed.data.listKey as ListKey,
      organizationId: orgId,
      userId: user.uid,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/superadmin/organizations/[orgId]/lists]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete an org-specific list item for the given org.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!WRITE_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const parsed = orgListItemDeleteSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await deleteOrgListItem(orgId, parsed.data.listKey as ListKey, parsed.data.value);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/superadmin/organizations/[orgId]/lists]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
