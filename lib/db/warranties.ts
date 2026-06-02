import { supabaseAdmin } from '@/lib/supabase/admin';
import { Warranty, DocumentRef } from '@/types';

type Row = Record<string, unknown>;

function toWarranty(r: Row): Warranty {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    assetId: r.asset_id as string,
    inventoryItemId: r.inventory_item_id as string,
    vendor: r.vendor as string,
    startDate: r.start_date ? new Date(r.start_date as string) : new Date(),
    endDate: r.end_date ? new Date(r.end_date as string) : new Date(),
    reminder: (r.reminder as boolean) ?? true,
    notes: r.notes as string,
    documents: Array.isArray(r.documents) ? (r.documents as DocumentRef[]) : [],
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: r.created_by as string,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: r.updated_by as string,
  };
}

async function namesByIds(
  table: 'assets' | 'inventory_items',
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await supabaseAdmin
    .from(table)
    .select('id, name')
    .in('id', ids);
  for (const d of data ?? []) {
    const row = d as Row;
    map.set(row.id as string, row.name as string);
  }
  return map;
}

async function attachAssetAndItemNames(
  warranties: Warranty[],
): Promise<Warranty[]> {
  const assetIds = Array.from(
    new Set(warranties.map((w) => w.assetId).filter((i): i is string => !!i)),
  );
  const itemIds = Array.from(
    new Set(
      warranties.map((w) => w.inventoryItemId).filter((i): i is string => !!i),
    ),
  );
  const [assetNames, itemNames] = await Promise.all([
    namesByIds('assets', assetIds),
    namesByIds('inventory_items', itemIds),
  ]);
  return warranties.map((w) => ({
    ...w,
    assetName: w.assetId ? assetNames.get(w.assetId) : undefined,
    inventoryItemName: w.inventoryItemId
      ? itemNames.get(w.inventoryItemId)
      : undefined,
  }));
}

type SortField = 'vendor' | 'startDate' | 'endDate' | 'assetId' | 'createdAt';

export async function getWarranties(
  orgId: string,
  opts?: {
    spaceId?: string;
    status?: string;
    assetId?: string;
    inventoryItemId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: SortField;
    sortDir?: 'asc' | 'desc';
  },
): Promise<{ items: Warranty[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortBy = opts?.sortBy ?? 'createdAt';
  const sortDir = opts?.sortDir ?? 'desc';

  let q = supabaseAdmin
    .from('warranties')
    .select('*')
    .eq('organization_id', orgId);
  if (opts?.spaceId) q = q.eq('space_id', opts.spaceId);
  if (opts?.assetId) q = q.eq('asset_id', opts.assetId);
  if (opts?.inventoryItemId)
    q = q.eq('inventory_item_id', opts.inventoryItemId);
  const { data, error } = await q;
  if (error) throw error;

  let warranties = (data ?? []).map(toWarranty);

  if (opts?.status) {
    const now = new Date();
    warranties = warranties.filter((w) => {
      if (opts.status === 'active') return w.endDate >= now;
      if (opts.status === 'expired') return w.endDate < now;
      return true;
    });
  }

  warranties = await attachAssetAndItemNames(warranties);
  const total = warranties.length;

  warranties.sort((a, b) => {
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
    items: warranties.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getWarrantyById(id: string): Promise<Warranty | null> {
  const { data } = await supabaseAdmin
    .from('warranties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toWarranty(data) : null;
}

export async function createWarranty(
  data: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'> & { spaceId?: string },
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('warranties')
    .insert({
      organization_id: data.organizationId,
      space_id: data.spaceId,
      asset_id: data.assetId ?? null,
      inventory_item_id: data.inventoryItemId ?? null,
      vendor: data.vendor,
      start_date: new Date(data.startDate).toISOString(),
      end_date: new Date(data.endDate).toISOString(),
      reminder: data.reminder ?? true,
      notes: data.notes,
      documents: data.documents ?? [],
      created_by: data.createdBy,
      updated_by: data.updatedBy,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function updateWarranty(
  id: string,
  data: Partial<Warranty>,
): Promise<void> {
  const patch: Row = {};
  if (data.assetId !== undefined) patch.asset_id = data.assetId;
  if (data.inventoryItemId !== undefined)
    patch.inventory_item_id = data.inventoryItemId;
  if (data.vendor !== undefined) patch.vendor = data.vendor;
  if (data.startDate !== undefined)
    patch.start_date = new Date(data.startDate).toISOString();
  if (data.endDate !== undefined)
    patch.end_date = new Date(data.endDate).toISOString();
  if (data.reminder !== undefined) patch.reminder = data.reminder;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.documents !== undefined) patch.documents = data.documents;
  if (data.updatedBy !== undefined) patch.updated_by = data.updatedBy;
  const { error } = await supabaseAdmin
    .from('warranties')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWarranty(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('warranties')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getExpiringWarranties(
  orgId: string,
  days = 30,
  spaceId?: string,
): Promise<Warranty[]> {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  let baseQ = supabaseAdmin
    .from('warranties')
    .select('*')
    .eq('organization_id', orgId);
  if (spaceId) baseQ = baseQ.eq('space_id', spaceId);
  const { data, error } = await baseQ
    .gte('end_date', now.toISOString())
    .lte('end_date', future.toISOString())
    .order('end_date', { ascending: true });
  if (error) throw error;
  return attachAssetAndItemNames((data ?? []).map(toWarranty));
}
