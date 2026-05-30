import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { Asset } from '@/types/asset.types'
import type { CreateAssetInput, UpdateAssetInput } from '@/lib/services/assets.service'

type Row = Record<string, unknown>

function d(v: unknown): Date | undefined {
  if (!v) return undefined
  const x = new Date(v as string)
  return isNaN(x.getTime()) ? undefined : x
}

function toAsset(r: Row): Asset {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    name: r.name as string,
    category: r.category as string,
    status: r.status as string,
    serialNumber: r.serial_number as string,
    purchaseDate: d(r.purchase_date),
    purchaseCost: r.purchase_cost as number,
    assignedTo: r.assigned_to as string,
    location: r.location as string,
    notes: r.notes as string,
    createdAt: d(r.created_at) ?? new Date(),
    createdBy: r.created_by as string,
    createdByEmail: r.created_by_email as string,
    createdByName: r.created_by_name as string,
    createdByRole: r.created_by_role as string,
    updatedAt: d(r.updated_at) ?? new Date(),
    updatedBy: r.updated_by as string,
    updatedByEmail: r.updated_by_email as string,
    updatedByName: r.updated_by_name as string,
    updatedByRole: r.updated_by_role as string,
  } as Asset
}

// camelCase input field → assets column. purchase_date handled separately.
const FIELD_COL: Record<string, string> = {
  name: 'name', category: 'category', status: 'status',
  serialNumber: 'serial_number', purchaseCost: 'purchase_cost',
  assignedTo: 'assigned_to', location: 'location', notes: 'notes',
}

function inputToColumns(input: Record<string, unknown>): Row {
  const out: Row = {}
  for (const [k, col] of Object.entries(FIELD_COL)) {
    if (input[k] !== undefined) out[col] = input[k]
  }
  if (input.purchaseDate !== undefined) {
    out.purchase_date = input.purchaseDate
      ? new Date(input.purchaseDate as string | Date).toISOString()
      : null
  }
  return out
}

type SortField = 'name' | 'category' | 'status' | 'serialNumber' | 'assignedTo' | 'location' | 'purchaseDate' | 'createdAt'

const SORT_COLUMN: Record<SortField, string> = {
  name: 'name', category: 'category', status: 'status',
  serialNumber: 'serial_number', assignedTo: 'assigned_to',
  location: 'location', purchaseDate: 'purchase_date', createdAt: 'created_at',
}

export interface GetAllAssetsOpts {
  status?: string
  category?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: SortField
  sortDir?: 'asc' | 'desc'
}

export class AssetsRepository {
  async getAll(
    tenant: TenantContext,
    opts?: GetAllAssetsOpts,
  ): Promise<{ items: Asset[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 10
    const sortCol = SORT_COLUMN[opts?.sortBy ?? 'createdAt']
    const ascending = (opts?.sortDir ?? 'desc') === 'asc'

    const eqMatch: Record<string, string> = {
      organization_id: tenant.organizationId,
    }
    if (tenant.spaceId) eqMatch.space_id = tenant.spaceId
    if (opts?.status) eqMatch.status = opts.status
    if (opts?.category) eqMatch.category = opts.category
    const like = opts?.search ? `%${opts.search}%` : null
    const orFilter = like
      ? `name.ilike.${like},category.ilike.${like},serial_number.ilike.${like},assigned_to.ilike.${like},location.ilike.${like}`
      : null

    let countQ = supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .match(eqMatch)
    if (orFilter) countQ = countQ.or(orFilter)
    const { count } = await countQ

    const total = count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const from = (safePage - 1) * pageSize

    let pageQ = supabaseAdmin.from('assets').select('*').match(eqMatch)
    if (orFilter) pageQ = pageQ.or(orFilter)
    const { data, error } = await pageQ
      .order(sortCol, { ascending, nullsFirst: false })
      .range(from, from + pageSize - 1)
    if (error) throw error

    return {
      items: (data ?? []).map(toAsset),
      total,
      page: safePage,
      pageSize,
      totalPages,
    }
  }

  async getCategories(tenant: TenantContext): Promise<string[]> {
    let q = supabaseAdmin
      .from('assets')
      .select('category')
      .eq('organization_id', tenant.organizationId)
    if (tenant.spaceId) q = q.eq('space_id', tenant.spaceId)
    const { data, error } = await q
    if (error) throw error
    const cats = new Set<string>()
    for (const r of data ?? []) {
      const c = (r as Row).category as string | undefined
      if (c) cats.add(c)
    }
    return Array.from(cats).sort()
  }

  async getById(tenant: TenantContext, id: string): Promise<Asset | null> {
    const { data } = await supabaseAdmin
      .from('assets')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    if (tenant.spaceId && data.space_id !== tenant.spaceId) return null
    return toAsset(data)
  }

  async create(
    tenant: TenantContext,
    input: CreateAssetInput,
  ): Promise<Asset> {
    const { data, error } = await supabaseAdmin
      .from('assets')
      .insert({
        ...inputToColumns(input as unknown as Record<string, unknown>),
        organization_id: tenant.organizationId,
        space_id: tenant.spaceId,
        created_by: tenant.user.uid,
        created_by_email: tenant.user.email,
        created_by_name: tenant.user.displayName,
        created_by_role: tenant.user.role,
        updated_by: tenant.user.uid,
        updated_by_email: tenant.user.email,
        updated_by_name: tenant.user.displayName,
        updated_by_role: tenant.user.role,
      })
      .select('*')
      .single()
    if (error) throw error
    return toAsset(data)
  }

  async update(
    tenant: TenantContext,
    id: string,
    input: UpdateAssetInput,
  ): Promise<Asset> {
    const { error } = await supabaseAdmin
      .from('assets')
      .update({
        ...inputToColumns(input as unknown as Record<string, unknown>),
        updated_by: tenant.user.uid,
        updated_by_email: tenant.user.email,
        updated_by_name: tenant.user.displayName,
        updated_by_role: tenant.user.role,
      })
      .eq('id', id)
    if (error) throw error
    return this.getById(tenant, id) as Promise<Asset>
  }

  async delete(_tenant: TenantContext, id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('assets').delete().eq('id', id)
    if (error) throw error
  }
}
