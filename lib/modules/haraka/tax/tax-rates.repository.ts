import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { TaxRate } from '@/types/pos.types'

type Row = Record<string, unknown>

function toTaxRate(r: Row): TaxRate {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    name: r.name as string,
    rate: typeof r.rate === 'number' ? r.rate : Number(r.rate ?? 0),
    isDefault: r.is_default === true,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? '',
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? '',
  }
}

export class TaxRatesRepository {
  async getAll(tenant: TenantContext): Promise<TaxRate[]> {
    const { data, error } = await supabaseAdmin
      .from('tax_rates')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
    return (data ?? [])
      .map(toTaxRate)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async getById(tenant: TenantContext, id: string): Promise<TaxRate | null> {
    const { data } = await supabaseAdmin
      .from('tax_rates')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    return toTaxRate(data)
  }

  private async clearOtherDefaults(tenant: TenantContext, excludeId?: string) {
    let q = supabaseAdmin
      .from('tax_rates')
      .update({ is_default: false })
      .eq('organization_id', tenant.organizationId)
      .eq('is_default', true)
    if (excludeId) q = q.neq('id', excludeId)
    const { error } = await q
    if (error) throw error
  }

  async create(
    tenant: TenantContext,
    input: { name: string; rate: number; isDefault?: boolean },
  ): Promise<string> {
    if (input.isDefault) await this.clearOtherDefaults(tenant)
    const { data, error } = await supabaseAdmin
      .from('tax_rates')
      .insert({
        organization_id: tenant.organizationId,
        name: input.name,
        rate: input.rate,
        is_default: input.isDefault === true,
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
    input: { name?: string; rate?: number; isDefault?: boolean },
  ): Promise<void> {
    const existing = await this.getById(tenant, id)
    if (!existing) throw new Error('Tax rate not found')
    if (input.isDefault) await this.clearOtherDefaults(tenant, id)
    const patch: Row = { updated_by: tenant.userId }
    if (input.name !== undefined) patch.name = input.name
    if (input.rate !== undefined) patch.rate = input.rate
    if (input.isDefault !== undefined) patch.is_default = input.isDefault
    const { error } = await supabaseAdmin
      .from('tax_rates')
      .update(patch)
      .eq('id', id)
    if (error) throw error
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const existing = await this.getById(tenant, id)
    if (!existing) throw new Error('Tax rate not found')
    const { error } = await supabaseAdmin
      .from('tax_rates')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
