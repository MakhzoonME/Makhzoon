import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { upsertOrgListItem, deleteOrgListItem } from '@/lib/db/managed-lists';
import {
  orgListItemSchema,
  orgListItemDeleteSchema,
} from '@/lib/validations/list-item.schema';
import type { ListKey } from '@/types';
import { auditLog } from '@/lib/platform/audit';

// Per-org list customization. Org-managers (admin/org_owner) and superadmins in
// transfer mode may add custom items or override/hide platform defaults for
// THEIR org. organizationId always comes from the resolved tenant, never the
// body, so cross-org writes are impossible.
const MANAGER_ROLES = new Set([
  'admin',
  'org_owner',
  'super_admin',
  'makhzoon_admin',
  'makhzoon_support',
]);

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    if (!MANAGER_ROLES.has(tenant.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = orgListItemSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await upsertOrgListItem({
      ...parsed.data,
      listKey: parsed.data.listKey as ListKey,
      organizationId: tenant.organizationId,
      userId: tenant.userId,
    });
    auditLog.queue({
      tenant,
      module: 'settings',
      action: 'ORG_LIST_ITEM_CREATED',
      newValue: { listKey: parsed.data.listKey, value: parsed.data.value, label: parsed.data.label },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return err instanceof NextResponse
      ? err
      : NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    if (!MANAGER_ROLES.has(tenant.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = orgListItemDeleteSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await deleteOrgListItem(
      tenant.organizationId,
      parsed.data.listKey as ListKey,
      parsed.data.value,
    );
    auditLog.queue({
      tenant,
      module: 'settings',
      action: 'ORG_LIST_ITEM_DELETED',
      newValue: { listKey: parsed.data.listKey, value: parsed.data.value },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return err instanceof NextResponse
      ? err
      : NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
