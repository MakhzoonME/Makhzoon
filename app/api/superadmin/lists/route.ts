import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import {
  getPlatformListItems,
  createPlatformListItem,
} from '@/lib/db/managed-lists';
import { platformListItemSchema } from '@/lib/validations/list-item.schema';
import { LIST_REGISTRY, type ListKey } from '@/types';
import { queueAuditLog } from '@/lib/audit/logger';

// Superadmin catalog of platform default list items. Read: any platform staff.
// Write: super_admin / makhzoon_admin (configuration owners).
const READ_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
const WRITE_ROLES = new Set(['super_admin', 'makhzoon_admin']);

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!READ_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const key = req.nextUrl.searchParams.get('key') as ListKey | null;
    const items = await getPlatformListItems(key ?? undefined);
    return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/superadmin/lists]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!WRITE_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsed = platformListItemSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Adding values to SYSTEM lists is forbidden — code owns those values.
    if (LIST_REGISTRY[parsed.data.listKey as ListKey].isSystem) {
      return NextResponse.json(
        { error: 'Cannot add items to a system list' },
        { status: 400 },
      );
    }

    const item = await createPlatformListItem({
      ...parsed.data,
      listKey: parsed.data.listKey as ListKey,
      isSystem: false,
      userId: user.uid,
    });

    queueAuditLog({
      organizationId: '',
      userId: user.uid,
      role: user.role,
      action: 'LIST_ITEM_CREATED',
      module: 'configuration',
      recordId: item.id,
      newValue: { listKey: item.listKey, value: item.value, label: item.label },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error('[POST /api/superadmin/lists]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
