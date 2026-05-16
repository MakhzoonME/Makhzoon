import { supabaseAdmin } from '@/lib/supabase/admin';
import { Asset } from '@/types';

type Row = Record<string, unknown>;

function toAsset(r: Row): Asset {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    name: r.name as string,
    category: r.category as string,
    status: r.status as string,
    serialNumber: r.serial_number as string,
    purchaseDate: r.purchase_date ? new Date(r.purchase_date as string) : (r.purchase_date as undefined),
    purchaseCost: r.purchase_cost as number,
    assignedTo: r.assigned_to as string,
    location: r.location as string,
    notes: r.notes as string,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: r.created_by as string,
    createdByEmail: r.created_by_email as string,
    createdByName: r.created_by_name as string,
    createdByRole: r.created_by_role as string,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: r.updated_by as string,
    updatedByEmail: r.updated_by_email as string,
    updatedByName: r.updated_by_name as string,
    updatedByRole: r.updated_by_role as string,
  };
}

type SortField =
  | 'name' | 'category' | 'status' | 'serialNumber' | 'assignedTo'
  | 'location' | 'purchaseDate' | 'purchaseCost' | 'createdAt' | 'updatedAt';

const SORT_COLUMN: Record<SortField, string> = {
  name: 'name', category: 'category', status: 'status',
  serialNumber: 'serial_number', assignedTo: 'assigned_to',
  location: 'location', purchaseDate: 'purchase_date',
  purchaseCost: 'purchase_cost', createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export async function getAssets(
  orgId: string,
  opts?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: SortField;
    sortDir?: 'asc' | 'desc';
  },
): Promise<{ items: Asset[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortCol = SORT_COLUMN[opts?.sortBy ?? 'createdAt'];
  const ascending = (opts?.sortDir ?? 'desc') === 'asc';

  // A query builder can't be reused after awaiting, so run a count query and
  // a page query independently. Filters use PostgREST `.match` + `.or`.
  const like = opts?.search ? `%${opts.search}%` : null;
  const orFilter = like
    ? `name.ilike.${like},serial_number.ilike.${like},assigned_to.ilike.${like},location.ilike.${like},category.ilike.${like}`
    : null;
  const eqMatch: Record<string, string> = { organization_id: orgId };
  if (opts?.status) eqMatch.status = opts.status;
  if (opts?.category) eqMatch.category = opts.category;

  let countQ = supabaseAdmin
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .match(eqMatch);
  if (orFilter) countQ = countQ.or(orFilter);
  const { count } = await countQ;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize;

  let pageQ = supabaseAdmin.from('assets').select('*').match(eqMatch);
  if (orFilter) pageQ = pageQ.or(orFilter);
  const { data, error } = await pageQ
    .order(sortCol, { ascending, nullsFirst: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;

  return {
    items: (data ?? []).map(toAsset),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getAssetById(id: string): Promise<Asset | null> {
  const { data } = await supabaseAdmin
    .from('assets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toAsset(data) : null;
}

export async function createAsset(
  data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('assets')
    .insert({
      organization_id: data.organizationId,
      name: data.name,
      category: data.category,
      status: data.status,
      serial_number: data.serialNumber,
      purchase_date: data.purchaseDate
        ? new Date(data.purchaseDate).toISOString()
        : null,
      purchase_cost: data.purchaseCost,
      assigned_to: data.assignedTo,
      location: data.location,
      notes: data.notes,
      created_by: data.createdBy,
      created_by_email: data.createdByEmail,
      created_by_name: data.createdByName,
      created_by_role: data.createdByRole,
      updated_by: data.updatedBy,
      updated_by_email: data.updatedByEmail,
      updated_by_name: data.updatedByName,
      updated_by_role: data.updatedByRole,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function updateAsset(
  id: string,
  data: Partial<Asset>,
): Promise<void> {
  const patch: Row = {};
  const map: Record<string, string> = {
    organizationId: 'organization_id', name: 'name', category: 'category',
    status: 'status', serialNumber: 'serial_number',
    purchaseCost: 'purchase_cost', assignedTo: 'assigned_to',
    location: 'location', notes: 'notes', updatedBy: 'updated_by',
    updatedByEmail: 'updated_by_email', updatedByName: 'updated_by_name',
    updatedByRole: 'updated_by_role',
  };
  for (const [k, col] of Object.entries(map)) {
    const v = (data as Record<string, unknown>)[k];
    if (v !== undefined) patch[col] = v;
  }
  if (data.purchaseDate !== undefined) {
    patch.purchase_date = data.purchaseDate
      ? new Date(data.purchaseDate).toISOString()
      : null;
  }
  const { error } = await supabaseAdmin
    .from('assets')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('assets').delete().eq('id', id);
  if (error) throw error;
}

export async function getAssetCategories(orgId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('assets')
    .select('category')
    .eq('organization_id', orgId);
  if (error) throw error;
  const cats = new Set(
    (data ?? [])
      .map((d) => (d as Row).category as string)
      .filter(Boolean),
  );
  return Array.from(cats).sort();
}
