import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { HarakaDeliveryAgent } from '@/types'

type Row = Record<string, unknown>

function toAgent(r: Row): HarakaDeliveryAgent {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    name: r.name as string,
    phone: (r.phone as string) ?? null,
    notes: (r.notes as string) ?? null,
    isActive: (r.is_active as boolean) ?? true,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? null,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? null,
  }
}

export interface CreateDeliveryAgentInput {
  name: string
  phone?: string | null
  notes?: string | null
  isActive?: boolean
}

export class DeliveryAgentsRepository {
  async list(tenant: TenantContext, onlyActive = false): Promise<HarakaDeliveryAgent[]> {
    let q = supabaseAdmin
      .from('haraka_delivery_agents')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .order('name')
    if (onlyActive) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(toAgent)
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaDeliveryAgent | null> {
    const { data } = await supabaseAdmin
      .from('haraka_delivery_agents')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    return toAgent(data)
  }

  async create(tenant: TenantContext, input: CreateDeliveryAgentInput): Promise<HarakaDeliveryAgent> {
    const { data, error } = await supabaseAdmin
      .from('haraka_delivery_agents')
      .insert({
        organization_id: tenant.organizationId,
        name: input.name,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        is_active: input.isActive ?? true,
        created_by: tenant.userId,
        updated_by: tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error
    return toAgent(data)
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: Partial<CreateDeliveryAgentInput>,
  ): Promise<HarakaDeliveryAgent> {
    const update: Record<string, unknown> = { updated_by: tenant.userId }
    if (patch.name !== undefined) update.name = patch.name
    if (patch.phone !== undefined) update.phone = patch.phone
    if (patch.notes !== undefined) update.notes = patch.notes
    if (patch.isActive !== undefined) update.is_active = patch.isActive
    const { data, error } = await supabaseAdmin
      .from('haraka_delivery_agents')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toAgent(data)
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_delivery_agents')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }
}
