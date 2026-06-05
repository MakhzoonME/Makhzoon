import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Request } from '@/types';

type Row = Record<string, unknown>;

function toRequest(r: Row): Request {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    type: r.type as Request['type'],
    assetId: r.asset_id as string,
    warrantyId: r.warranty_id as string,
    inventoryItemId: r.inventory_item_id as string,
    inventoryItemName: r.inventory_item_name as string,
    description: r.description as string,
    status: r.status as Request['status'],
    decisionBy: r.decision_by as string,
    decisionAt: r.decision_at ? new Date(r.decision_at as string) : undefined,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: r.created_by as string,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: r.updated_by as string,
  };
}

async function enrichRequests(requests: Request[]): Promise<Request[]> {
  if (requests.length === 0) return requests;

  const assetIds = Array.from(
    new Set(requests.map((r) => r.assetId).filter(Boolean) as string[]),
  );
  const itemIds = Array.from(
    new Set(
      requests.map((r) => r.inventoryItemId).filter(Boolean) as string[],
    ),
  );
  const userIds = Array.from(
    new Set(requests.map((r) => r.createdBy).filter(Boolean)),
  );

  const [assetsRes, itemsRes, usersRes] = await Promise.all([
    assetIds.length
      ? supabaseAdmin.from('assets').select('id, name').in('id', assetIds)
      : Promise.resolve({ data: [] as Row[] }),
    itemIds.length
      ? supabaseAdmin
          .from('inventory_items')
          .select('id, name')
          .in('id', itemIds)
      : Promise.resolve({ data: [] as Row[] }),
    userIds.length
      ? supabaseAdmin
          .from('users')
          .select('id, display_name, email')
          .in('id', userIds)
      : Promise.resolve({ data: [] as Row[] }),
  ]);

  const assetNames = new Map<string, string>();
  for (const a of (assetsRes.data ?? []) as Row[])
    assetNames.set(a.id as string, a.name as string);
  const itemNames = new Map<string, string>();
  for (const i of (itemsRes.data ?? []) as Row[])
    itemNames.set(i.id as string, i.name as string);
  const users = new Map<string, { name?: string; email?: string }>();
  for (const u of (usersRes.data ?? []) as Row[])
    users.set(u.id as string, {
      name: u.display_name as string,
      email: u.email as string,
    });

  return requests.map((r) => ({
    ...r,
    assetName: r.assetId ? assetNames.get(r.assetId) : undefined,
    inventoryItemName: r.inventoryItemId
      ? itemNames.get(r.inventoryItemId)
      : undefined,
    createdByName: users.get(r.createdBy)?.name,
    createdByEmail: users.get(r.createdBy)?.email,
  }));
}

type SortField = 'type' | 'status' | 'createdAt' | 'decisionAt';

export async function getRequests(
  orgId: string,
  opts?: {
    spaceId?: string;
    status?: string;
    type?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: SortField;
    sortDir?: 'asc' | 'desc';
  },
): Promise<{ items: Request[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortBy = opts?.sortBy ?? 'createdAt';
  const sortDir = opts?.sortDir ?? 'desc';

  let q = supabaseAdmin
    .from('requests')
    .select('*')
    .eq('organization_id', orgId);
  if (opts?.spaceId) q = q.eq('space_id', opts.spaceId);
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.type) q = q.eq('type', opts.type);
  if (opts?.userId) q = q.eq('created_by', opts.userId);
  const { data, error } = await q;
  if (error) throw error;

  const requests = await enrichRequests((data ?? []).map(toRequest));
  const total = requests.length;

  requests.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const mult = sortDir === 'asc' ? 1 : -1;
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return mult;
    if (bVal == null) return -mult;
    if (aVal instanceof Date && bVal instanceof Date) {
      return (aVal.getTime() - bVal.getTime()) * mult;
    }
    return String(aVal).localeCompare(String(bVal)) * mult;
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: requests.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getRequestById(id: string): Promise<Request | null> {
  const { data } = await supabaseAdmin
    .from('requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toRequest(data) : null;
}

export async function createRequest(
  data: Omit<Request, 'id' | 'createdAt' | 'updatedAt'> & { spaceId?: string },
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('requests')
    .insert({
      organization_id: data.organizationId,
      space_id: data.spaceId,
      type: data.type,
      asset_id: data.assetId ?? null,
      warranty_id: data.warrantyId ?? null,
      inventory_item_id: data.inventoryItemId ?? null,
      inventory_item_name: data.inventoryItemName ?? null,
      description: data.description,
      status: data.status,
      decision_by: data.decisionBy ?? null,
      decision_at: data.decisionAt
        ? new Date(data.decisionAt).toISOString()
        : null,
      created_by: data.createdBy,
      updated_by: data.updatedBy,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function updateRequest(
  id: string,
  data: Partial<Request>,
): Promise<void> {
  const patch: Row = {};
  if (data.type !== undefined) patch.type = data.type;
  if (data.assetId !== undefined) patch.asset_id = data.assetId;
  if (data.warrantyId !== undefined) patch.warranty_id = data.warrantyId;
  if (data.inventoryItemId !== undefined)
    patch.inventory_item_id = data.inventoryItemId;
  if (data.inventoryItemName !== undefined)
    patch.inventory_item_name = data.inventoryItemName;
  if (data.description !== undefined) patch.description = data.description;
  if (data.status !== undefined) patch.status = data.status;
  if (data.decisionBy !== undefined) patch.decision_by = data.decisionBy;
  if (data.decisionAt !== undefined)
    patch.decision_at = data.decisionAt
      ? new Date(data.decisionAt).toISOString()
      : null;
  if (data.updatedBy !== undefined) patch.updated_by = data.updatedBy;
  const { error } = await supabaseAdmin
    .from('requests')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}
