import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getAuditLogs } from '@/lib/db/audit-logs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hasPermission } from '@/lib/permissions';
import { hasSuperAdminPermission } from '@/lib/permissions/superadmin';
import { AuditLog } from '@/types';

async function batchGetNames(
  table: string,
  field: string,
  ids: string[]
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map();
  const map = new Map<string, string>();
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(`id, ${field}`)
    .in('id', unique);
  if (error) return map;
  for (const row of data ?? []) {
    const r = row as unknown as Record<string, unknown>;
    const val = r[field];
    if (val) map.set(r.id as string, String(val));
  }
  return map;
}

async function enrichLogs(logs: AuditLog[]): Promise<AuditLog[]> {
  if (!logs.length) return logs;

  const userIds = logs.map((l) => l.userId).filter(Boolean);
  const orgIds = logs.map((l) => l.organizationId).filter(Boolean);

  const moduleGroups: Record<string, string[]> = {};
  for (const l of logs) {
    if (!l.recordId) continue;
    const mod = l.module?.toLowerCase() ?? '';
    if (!moduleGroups[mod]) moduleGroups[mod] = [];
    moduleGroups[mod].push(l.recordId);
  }

  // Postgres tables/columns (snake_case).
  const collectionForModule: Record<string, { col: string; field: string }> = {
    assets: { col: 'assets', field: 'name' },
    asset: { col: 'assets', field: 'name' },
    users: { col: 'users', field: 'display_name' },
    user: { col: 'users', field: 'display_name' },
    invites: { col: 'invites', field: 'display_name' },
    invite: { col: 'invites', field: 'display_name' },
    inventory: { col: 'inventory_items', field: 'name' },
    'inventory items': { col: 'inventory_items', field: 'name' },
    maintenance: { col: 'maintenance_records', field: 'description' },
    warranties: { col: 'warranties', field: 'vendor' },
    warranty: { col: 'warranties', field: 'vendor' },
    requests: { col: 'requests', field: 'description' },
    request: { col: 'requests', field: 'description' },
    organizations: { col: 'organizations', field: 'name' },
    organization: { col: 'organizations', field: 'name' },
    tickets: { col: 'support_tickets', field: 'subject' },
    ticket: { col: 'support_tickets', field: 'subject' },
    packages: { col: 'packages', field: 'name' },
    package: { col: 'packages', field: 'name' },
  };

  const spaceIds = logs.map((l) => l.spaceId).filter((id): id is string => !!id);
  const [userNamesOrg, userNamesSuperAdmin, orgNames, spaceNames, recordMaps] = await Promise.all([
    batchGetNames('users', 'display_name', userIds),
    batchGetNames('superadmin_users', 'display_name', userIds),
    batchGetNames('organizations', 'name', orgIds),
    batchGetNames('spaces', 'name', spaceIds),
    Promise.all(
      Object.entries(moduleGroups).map(async ([mod, ids]) => {
        const cfg = collectionForModule[mod];
        if (!cfg) return { mod, map: new Map<string, string>() };
        const map = await batchGetNames(cfg.col, cfg.field, ids);
        return { mod, map };
      })
    ),
  ]);

  const recordNameByModuleAndId = new Map<string, string>();
  for (const { mod, map } of recordMaps) {
    map.forEach((name, id) => recordNameByModuleAndId.set(`${mod}:${id}`, name));
  }

  const userNames = new Map<string, string>();
  userNamesOrg.forEach((v, k) => userNames.set(k, v));
  userNamesSuperAdmin.forEach((v, k) => { if (!userNames.has(k)) userNames.set(k, v); });

  return logs.map((l) => ({
    ...l,
    userDisplayName: userNames.get(l.userId) as string | undefined,
    orgName: orgNames.get(l.organizationId),
    spaceName: l.spaceId ? spaceNames.get(l.spaceId) : undefined,
    recordName: recordNameByModuleAndId.get(`${l.module?.toLowerCase() ?? ''}:${l.recordId}`),
  }));
}

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isSuperadmin = SUPERADMIN_ROLES.has(user.role);
    const isOrgAdmin = user.role === 'admin' || user.role === 'org_owner';

    if (isSuperadmin && !hasSuperAdminPermission(user, 'auditLogs', 'view'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (isOrgAdmin && !hasPermission(user, 'auditLogs', 'view'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!isSuperadmin && !isOrgAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const orgId =
      (user.role === 'admin' || user.role === 'org_owner')
        ? (user.organizationId ?? undefined)
        : (searchParams.get('orgId') ?? undefined);
    const userId = searchParams.get('userId') ?? undefined;
    const recordId = searchParams.get('recordId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined;

    const isOrgUser = user.role === 'admin' || user.role === 'org_owner';
    // Audit logs are hard-scoped to the active space by default. The client
    // fetch wrapper sends x-space-slug; map to id and filter. Pass
    // ?allSpaces=true (admin/owner) to see logs across every accessible space.
    // Platform admins always see all spaces.
    const allSpaces = searchParams.get('allSpaces') === 'true';
    const spaceSlug = req.headers.get('x-space-slug') ?? undefined;
    let spaceId: string | undefined;
    if (isOrgUser && !allSpaces && spaceSlug && orgId) {
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { data: s } = await supabaseAdmin
        .from('spaces')
        .select('id')
        .eq('organization_id', orgId)
        .eq('slug', spaceSlug)
        .maybeSingle();
      if (s) spaceId = s.id as string;
    }
    const result = await getAuditLogs({ orgId, spaceId, userId, recordId, action, dateFrom, dateTo, page, pageSize, excludeSuperadminActions: isOrgUser });
    const enriched = await enrichLogs(result.logs);
    return NextResponse.json({ ...result, logs: enriched });
  } catch (err) {
    console.error('[GET /api/audit-logs]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
