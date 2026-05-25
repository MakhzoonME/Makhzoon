import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import {
  getPlatformListItemById,
  updatePlatformListItem,
  deletePlatformListItem,
} from '@/lib/db/managed-lists';
import { platformListItemUpdateSchema } from '@/lib/validations/list-item.schema';
import { queueAuditLog } from '@/lib/audit/logger';

const WRITE_ROLES = new Set(['super_admin', 'makhzoon_admin']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!WRITE_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const existing = await getPlatformListItemById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const parsed = platformListItemUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // System items: only label/color/order/visibility are editable — never the
    // value. (The update schema already omits value; this is defense in depth.)
    await updatePlatformListItem(id, { ...parsed.data, userId: user.uid });

    queueAuditLog({
      organizationId: '',
      userId: user.uid,
      role: user.role,
      action: 'LIST_ITEM_UPDATED',
      module: 'configuration',
      recordId: id,
      oldValue: { label: existing.label, color: existing.color, enabled: existing.enabled },
      newValue: parsed.data,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/superadmin/lists/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!WRITE_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const existing = await getPlatformListItemById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // System list values are code-owned — deleting them would orphan logic.
    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'System list items cannot be deleted (you can hide them instead)' },
        { status: 400 },
      );
    }

    await deletePlatformListItem(id);

    queueAuditLog({
      organizationId: '',
      userId: user.uid,
      role: user.role,
      action: 'LIST_ITEM_DELETED',
      module: 'configuration',
      recordId: id,
      oldValue: { listKey: existing.listKey, value: existing.value },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/superadmin/lists/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
