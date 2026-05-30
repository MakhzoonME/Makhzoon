import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { PosCustomer } from '@/types'

type Row = Record<string, unknown>

function toCustomer(r: Row): PosCustomer {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    name: (r.name as string) ?? '',
    phone: (r.phone as string) ?? null,
    email: (r.email as string) ?? null,
    taxNumber: (r.tax_number as string) ?? null,
    notes: (r.notes as string) ?? null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? '',
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? '',
  }
}

export interface CustomerListOpts {
  search?: string
  page?: number
  pageSize?: number
}

export interface CustomerInput {
  name: string
  phone?: string | null
  email?: string | null
  taxNumber?: string | null
  notes?: string | null
}

export class CustomersRepository {
  async list(tenant: TenantContext, opts?: CustomerListOpts) {
    let q = supabaseAdmin
      .from('pos_customers')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (tenant.spaceId) q = q.eq('space_id', tenant.spaceId)
    const { data, error } = await q
    if (error) throw error
    let items = (data ?? []).map(toCustomer)

    const search = opts?.search?.trim().toLowerCase()
    if (search) {
      items = items.filter((c) =>
        [c.name, c.phone ?? '', c.email ?? '', c.taxNumber ?? '']
          .join(' ')
          .toLowerCase()
          .includes(search),
      )
    }
    items.sort((a, b) => a.name.localeCompare(b.name))

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return {
      items: items.slice(start, start + pageSize),
      total,
      page: safePage,
      pageSize,
      totalPages,
    }
  }

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<PosCustomer | null> {
    const { data } = await supabaseAdmin
      .from('pos_customers')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    if (tenant.spaceId && data.space_id !== tenant.spaceId) return null
    return toCustomer(data)
  }

  async create(
    tenant: TenantContext,
    input: CustomerInput,
  ): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('pos_customers')
      .insert({
        organization_id: tenant.organizationId,
        space_id: tenant.spaceId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        tax_number: input.taxNumber ?? null,
        notes: input.notes ?? null,
        created_by: tenant.userId,
        updated_by: tenant.userId,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
  }

  async update(
    tenant: TenantContext,
    id: string,
    input: Partial<CustomerInput>,
  ): Promise<void> {
    const existing = await this.getById(tenant, id)
    if (!existing) throw new Error('Customer not found')
    const patch: Row = { updated_by: tenant.userId }
    if ('name' in input) patch.name = input.name ?? null
    if ('phone' in input) patch.phone = input.phone ?? null
    if ('email' in input) patch.email = input.email ?? null
    if ('taxNumber' in input) patch.tax_number = input.taxNumber ?? null
    if ('notes' in input) patch.notes = input.notes ?? null
    const { error } = await supabaseAdmin
      .from('pos_customers')
      .update(patch)
      .eq('id', id)
    if (error) throw error
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const existing = await this.getById(tenant, id)
    if (!existing) throw new Error('Customer not found')
    const { error } = await supabaseAdmin
      .from('pos_customers')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
