import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAuditLogs } from '@/lib/db/audit-logs';
import { adminDb } from '@/lib/firebase/admin';
import { AuditLog } from '@/types';

async function batchGetNames(
  collection: string,
  field: string,
  ids: string[]
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map();
  const docs = await Promise.all(unique.map((id) => adminDb.collection(collection).doc(id).get()));
  const map = new Map<string, string>();
  docs.forEach((doc, i) => {
    if (doc.exists) {
      const val = doc.data()?.[field];
      if (val) map.set(unique[i], String(val));
    }
  });
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

  const collectionForModule: Record<string, { col: string; field: string }> = {
    assets: { col: 'assets', field: 'name' },
    asset: { col: 'assets', field: 'name' },
    users: { col: 'users', field: 'displayName' },
    user: { col: 'users', field: 'displayName' },
    invites: { col: 'invites', field: 'displayName' },
    invite: { col: 'invites', field: 'displayName' },
    inventory: { col: 'inventoryItems', field: 'name' },
    'inventory items': { col: 'inventoryItems', field: 'name' },
    maintenance: { col: 'maintenanceRecords', field: 'title' },
    warranties: { col: 'warranties', field: 'vendor' },
    warranty: { col: 'warranties', field: 'vendor' },
    requests: { col: 'requests', field: 'title' },
    request: { col: 'requests', field: 'title' },
    organizations: { col: 'organizations', field: 'name' },
    organization: { col: 'organizations', field: 'name' },
    tickets: { col: 'supportTickets', field: 'subject' },
    ticket: { col: 'supportTickets', field: 'subject' },
    packages: { col: 'packages', field: 'name' },
    package: { col: 'packages', field: 'name' },
  };

  const [userNamesOrg, userNamesSuperAdmin, orgNames, recordMaps] = await Promise.all([
    batchGetNames('users', 'displayName', userIds),
    batchGetNames('superadminUsers', 'displayName', userIds),
    batchGetNames('organizations', 'name', orgIds),
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
    recordName: recordNameByModuleAndId.get(`${l.module?.toLowerCase() ?? ''}:${l.recordId}`),
  }));
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const orgId =
      user.role === 'admin'
        ? (user.organizationId ?? undefined)
        : (searchParams.get('orgId') ?? undefined);
    const userId = searchParams.get('userId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;
    const cursor = searchParams.get('cursor') ?? undefined;

    const result = await getAuditLogs({ orgId, userId, action, dateFrom, dateTo, cursor });
    const enriched = await enrichLogs(result.logs);
    return NextResponse.json({ ...result, logs: enriched });
  } catch (err) {
    console.error('[GET /api/audit-logs]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
