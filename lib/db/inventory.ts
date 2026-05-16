import { supabaseAdmin } from '@/lib/supabase/admin';
import { InventoryItem, InventoryTransaction, StockStatus } from '@/types';

type Row = Record<string, unknown>;

function stockStatus(qty: number, threshold: number): StockStatus {
  if (qty === 0) return 'out';
  if (qty < threshold) return 'low';
  return 'ok';
}

function toItem(r: Row): InventoryItem {
  const qty = (r.quantity_on_hand as number) ?? 0;
  const min = (r.minimum_threshold as number) ?? 0;
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    name: r.name as string,
    category: r.category as string,
    sku: r.sku as string,
    unit: r.unit as string,
    quantityOnHand: qty,
    minimumThreshold: min,
    reorderQuantity: r.reorder_quantity as number,
    location: r.location as string,
    supplier: r.supplier as string,
    unitCost: r.unit_cost as number,
    notes: r.notes as string,
    stockStatus: (r.stock_status as StockStatus) ?? stockStatus(qty, min),
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: r.created_by as string,
    createdByEmail: r.created_by_email as string,
    createdByName: r.created_by_name as string,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: r.updated_by as string,
    updatedByEmail: r.updated_by_email as string,
    updatedByName: r.updated_by_name as string,
  };
}

function toTransaction(r: Row): InventoryTransaction {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    itemId: r.item_id as string,
    itemName: r.item_name as string,
    type: r.type as InventoryTransaction['type'],
    quantity: r.quantity as number,
    quantityBefore: r.quantity_before as number,
    quantityAfter: r.quantity_after as number,
    reason: r.reason as string,
    note: r.note as string,
    performedAt: r.performed_at ? new Date(r.performed_at as string) : new Date(),
    performedBy: r.performed_by as string,
    performedByEmail: r.performed_by_email as string,
    performedByName: r.performed_by_name as string,
    performedByRole: r.performed_by_role as string,
  };
}

type SortField =
  | 'name' | 'category' | 'stockStatus' | 'quantityOnHand'
  | 'minimumThreshold' | 'location' | 'supplier' | 'unitCost' | 'createdAt';

const SORT_COLUMN: Record<SortField, string> = {
  name: 'name', category: 'category', stockStatus: 'stock_status',
  quantityOnHand: 'quantity_on_hand', minimumThreshold: 'minimum_threshold',
  location: 'location', supplier: 'supplier', unitCost: 'unit_cost',
  createdAt: 'created_at',
};

export async function getInventoryItems(
  orgId: string,
  opts?: {
    category?: string;
    stockStatus?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: SortField;
    sortDir?: 'asc' | 'desc';
  },
): Promise<{ items: InventoryItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortCol = SORT_COLUMN[opts?.sortBy ?? 'createdAt'];
  const ascending = (opts?.sortDir ?? 'desc') === 'asc';

  const eqMatch: Record<string, string> = { organization_id: orgId };
  if (opts?.category) eqMatch.category = opts.category;
  if (opts?.stockStatus) eqMatch.stock_status = opts.stockStatus;
  const like = opts?.search ? `%${opts.search}%` : null;
  const orFilter = like
    ? `name.ilike.${like},category.ilike.${like},sku.ilike.${like},location.ilike.${like}`
    : null;

  let countQ = supabaseAdmin
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .match(eqMatch);
  if (orFilter) countQ = countQ.or(orFilter);
  const { count } = await countQ;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize;

  let pageQ = supabaseAdmin.from('inventory_items').select('*').match(eqMatch);
  if (orFilter) pageQ = pageQ.or(orFilter);
  const { data, error } = await pageQ
    .order(sortCol, { ascending, nullsFirst: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;

  return {
    items: (data ?? []).map(toItem),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getInventoryItemById(
  id: string,
): Promise<InventoryItem | null> {
  const { data } = await supabaseAdmin
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toItem(data) : null;
}

export async function createInventoryItem(
  data: Omit<InventoryItem, 'id' | 'stockStatus' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const status = stockStatus(data.quantityOnHand, data.minimumThreshold);
  const { data: row, error } = await supabaseAdmin
    .from('inventory_items')
    .insert({
      organization_id: data.organizationId,
      name: data.name,
      category: data.category,
      sku: data.sku,
      unit: data.unit,
      quantity_on_hand: data.quantityOnHand,
      minimum_threshold: data.minimumThreshold,
      reorder_quantity: data.reorderQuantity,
      location: data.location,
      supplier: data.supplier,
      unit_cost: data.unitCost,
      notes: data.notes,
      stock_status: status,
      created_by: data.createdBy,
      created_by_email: data.createdByEmail,
      created_by_name: data.createdByName,
      updated_by: data.updatedBy,
      updated_by_email: data.updatedByEmail,
      updated_by_name: data.updatedByName,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function updateInventoryItem(
  id: string,
  data: Partial<InventoryItem>,
): Promise<void> {
  const patch: Row = {};
  const map: Record<string, string> = {
    name: 'name', category: 'category', sku: 'sku', unit: 'unit',
    reorderQuantity: 'reorder_quantity', location: 'location',
    supplier: 'supplier', unitCost: 'unit_cost', notes: 'notes',
    updatedBy: 'updated_by', updatedByEmail: 'updated_by_email',
    updatedByName: 'updated_by_name',
  };
  for (const [k, col] of Object.entries(map)) {
    const v = (data as Record<string, unknown>)[k];
    if (v !== undefined) patch[col] = v;
  }
  if (data.quantityOnHand !== undefined) patch.quantity_on_hand = data.quantityOnHand;
  if (data.minimumThreshold !== undefined) patch.minimum_threshold = data.minimumThreshold;

  if (data.quantityOnHand !== undefined || data.minimumThreshold !== undefined) {
    const current = await getInventoryItemById(id);
    if (!current) throw new Error(`Inventory item ${id} not found`);
    const qty = data.quantityOnHand ?? current.quantityOnHand;
    const threshold = data.minimumThreshold ?? current.minimumThreshold;
    patch.stock_status = stockStatus(qty, threshold);
  }

  const { error } = await supabaseAdmin
    .from('inventory_items')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('inventory_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getInventoryCategories(
  orgId: string,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('inventory_items')
    .select('category')
    .eq('organization_id', orgId);
  if (error) throw error;
  const cats = new Set(
    (data ?? []).map((d) => (d as Row).category as string).filter(Boolean),
  );
  return Array.from(cats).sort();
}

export async function getInventoryTransactions(
  itemId: string,
): Promise<InventoryTransaction[]> {
  const { data, error } = await supabaseAdmin
    .from('inventory_transactions')
    .select('*')
    .eq('item_id', itemId)
    .order('performed_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(toTransaction);
}

export async function createInventoryTransaction(
  tx: Omit<InventoryTransaction, 'id' | 'performedAt'>,
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('inventory_transactions')
    .insert({
      organization_id: tx.organizationId,
      item_id: tx.itemId,
      item_name: tx.itemName,
      type: tx.type,
      quantity: tx.quantity,
      quantity_before: tx.quantityBefore,
      quantity_after: tx.quantityAfter,
      reason: tx.reason,
      note: tx.note,
      performed_by: tx.performedBy,
      performed_by_email: tx.performedByEmail,
      performed_by_name: tx.performedByName,
      performed_by_role: tx.performedByRole,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function applyInventoryTransaction(
  itemId: string,
  type: 'in' | 'out' | 'adjustment',
  quantity: number,
  actor: { uid: string; email?: string; displayName?: string; role?: string },
  reason: string,
  note?: string,
): Promise<{ quantityAfter: number }> {
  // NOTE: Firestore used a multi-doc transaction. Postgres-native atomicity
  // here would be a SECURITY DEFINER RPC; given the internal/staging scope
  // (downtime/races acceptable) this is a read-modify-write. Harden later via
  // an RPC if concurrent stock writes become a concern.
  const item = await getInventoryItemById(itemId);
  if (!item) throw new Error('Item not found');

  let newQty: number;
  if (type === 'in') newQty = item.quantityOnHand + quantity;
  else if (type === 'out') newQty = Math.max(0, item.quantityOnHand - quantity);
  else newQty = quantity;

  const { error: upErr } = await supabaseAdmin
    .from('inventory_items')
    .update({
      quantity_on_hand: newQty,
      stock_status: stockStatus(newQty, item.minimumThreshold),
    })
    .eq('id', itemId);
  if (upErr) throw upErr;

  const { error: txErr } = await supabaseAdmin
    .from('inventory_transactions')
    .insert({
      organization_id: item.organizationId,
      item_id: itemId,
      item_name: item.name,
      type,
      quantity,
      quantity_before: item.quantityOnHand,
      quantity_after: newQty,
      reason,
      note: note || null,
      performed_by: actor.uid,
      performed_by_email: actor.email ?? null,
      performed_by_name: actor.displayName ?? null,
      performed_by_role: actor.role ?? null,
    });
  if (txErr) throw txErr;

  return { quantityAfter: newQty };
}
