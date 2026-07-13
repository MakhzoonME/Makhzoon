import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { HarakaService } from '@/types'

type Row = Record<string, unknown>

function toService(r: Row): HarakaService {
  return {
    id:               r.id as string,
    organizationId:   r.organization_id as string,
    spaceId:          (r.space_id as string) ?? null,
    name:             r.name as string,
    category:         (r.category as string) ?? null,
    description:      (r.description as string) ?? null,
    price:            Number(r.price ?? 0),
    taxRateId:        (r.tax_rate_id as string) ?? null,
    active:           (r.active as boolean) ?? true,
    createdAt:        r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:        (r.created_by as string) ?? null,
    createdByEmail:   (r.created_by_email as string) ?? null,
    createdByName:    (r.created_by_name as string) ?? null,
    updatedAt:        r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:        (r.updated_by as string) ?? null,
    updatedByEmail:   (r.updated_by_email as string) ?? null,
    updatedByName:    (r.updated_by_name as string) ?? null,
  }
}

export interface ListServicesOpts {
  search?:   string
  active?:   boolean
  category?: string
  page?:     number
  pageSize?: number
}

export interface CreateServiceInput {
  name:        string
  category?:   string | null
  description?: string | null
  price:       number
  taxRateId?:  string | null
  active?:     boolean
}

export interface UpdateServiceInput {
  name?:        string
  category?:    string | null
  description?: string | null
  price?:       number
  taxRateId?:   string | null
  active?:      boolean
}

export class ServicesRepository {
  async list(tenant: TenantContext, opts?: ListServicesOpts) {
    let q = supabaseAdmin
      .from('haraka_services')
      .select('*', { count: 'exact' })
      .eq('organization_id', tenant.organizationId)
    if (tenant.spaceId) q = q.eq('space_id', tenant.spaceId)
    if (opts?.active !== undefined) q = q.eq('active', opts.active)
    if (opts?.category) q = q.eq('category', opts.category)
    if (opts?.search) {
      const term = opts.search.replace(/[,()%*\\]/g, ' ').trim()
      if (term) q = q.or(['name', 'category', 'description'].map((c) => `${c}.ilike.%${term}%`).join(','))
    }

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 50
    const from = (Math.max(1, page) - 1) * pageSize
    const { data, count, error } = await q
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw error

    const total = count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return { items: (data ?? []).map((r) => toService(r as Row)), total, page, pageSize, totalPages }
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaService | null> {
    const { data } = await supabaseAdmin
      .from('haraka_services')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || (data as Row).organization_id !== tenant.organizationId) return null
    return toService(data as Row)
  }

  async getCategories(tenant: TenantContext): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('haraka_services')
      .select('category')
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
    const cats = new Set((data ?? []).map((d) => (d as Row).category as string).filter(Boolean))
    return Array.from(cats).sort()
  }

  async create(tenant: TenantContext, input: CreateServiceInput): Promise<HarakaService> {
    const { data, error } = await supabaseAdmin
      .from('haraka_services')
      .insert({
        organization_id:  tenant.organizationId,
        space_id:         tenant.spaceId ?? null,
        name:             input.name,
        category:         input.category ?? null,
        description:      input.description ?? null,
        price:            input.price,
        tax_rate_id:      input.taxRateId ?? null,
        active:           input.active ?? true,
        created_by:       tenant.userId,
        created_by_email: tenant.user.email ?? null,
        created_by_name:  tenant.user.displayName ?? null,
        updated_by:       tenant.userId,
        updated_by_email: tenant.user.email ?? null,
        updated_by_name:  tenant.user.displayName ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return toService(data as Row)
  }

  async update(tenant: TenantContext, id: string, input: UpdateServiceInput): Promise<HarakaService> {
    const patch: Row = {
      updated_by: tenant.userId,
      updated_by_email: tenant.user.email ?? null,
      updated_by_name: tenant.user.displayName ?? null,
    }
    const map: Record<string, string> = {
      name: 'name', category: 'category', description: 'description',
      price: 'price', taxRateId: 'tax_rate_id', active: 'active',
    }
    for (const [k, col] of Object.entries(map)) {
      const v = (input as Record<string, unknown>)[k]
      if (v !== undefined) patch[col] = v
    }

    const { data, error } = await supabaseAdmin
      .from('haraka_services')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toService(data as Row)
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_services')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }
}
