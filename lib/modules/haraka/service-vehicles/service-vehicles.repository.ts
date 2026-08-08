import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { HarakaServiceVehicle } from '@/types'

type Row = Record<string, unknown>

function toVehicle(r: Row): HarakaServiceVehicle {
  return {
    id:             r.id as string,
    organizationId: r.organization_id as string,
    customerId:     (r.customer_id as string) ?? null,
    plateNumber:    r.plate_number as string,
    make:           (r.make as string) ?? null,
    model:          (r.model as string) ?? null,
    color:          (r.color as string) ?? null,
    notes:          (r.notes as string) ?? null,
    createdAt:      r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:      (r.created_by as string) ?? null,
    updatedAt:      r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:      (r.updated_by as string) ?? null,
  }
}

export interface CreateServiceVehicleInput {
  customerId?:  string | null
  plateNumber:  string
  make?:        string | null
  model?:       string | null
  color?:       string | null
  notes?:       string | null
}

export class ServiceVehiclesRepository {
  async list(tenant: TenantContext, search?: string): Promise<HarakaServiceVehicle[]> {
    let q = supabaseAdmin
      .from('haraka_service_vehicles')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .order('created_at', { ascending: false })
    if (search) q = q.ilike('plate_number', `%${search}%`)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(toVehicle)
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaServiceVehicle | null> {
    const { data } = await supabaseAdmin
      .from('haraka_service_vehicles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || (data as Row).organization_id !== tenant.organizationId) return null
    return toVehicle(data as Row)
  }

  /** Exact-match plate lookup — the "already have a vehicle on file" path in intake. */
  async findByPlate(tenant: TenantContext, plateNumber: string): Promise<HarakaServiceVehicle | null> {
    const { data } = await supabaseAdmin
      .from('haraka_service_vehicles')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('plate_number', plateNumber)
      .maybeSingle()
    return data ? toVehicle(data as Row) : null
  }

  async create(tenant: TenantContext, input: CreateServiceVehicleInput): Promise<HarakaServiceVehicle> {
    const { data, error } = await supabaseAdmin
      .from('haraka_service_vehicles')
      .insert({
        organization_id: tenant.organizationId,
        customer_id:      input.customerId ?? null,
        plate_number:     input.plateNumber,
        make:             input.make ?? null,
        model:            input.model ?? null,
        color:            input.color ?? null,
        notes:            input.notes ?? null,
        created_by:       tenant.userId,
        updated_by:       tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error
    return toVehicle(data as Row)
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: Partial<CreateServiceVehicleInput>,
  ): Promise<HarakaServiceVehicle> {
    const update: Row = { updated_by: tenant.userId }
    if (patch.customerId  !== undefined) update.customer_id  = patch.customerId
    if (patch.plateNumber !== undefined) update.plate_number = patch.plateNumber
    if (patch.make        !== undefined) update.make         = patch.make
    if (patch.model       !== undefined) update.model        = patch.model
    if (patch.color       !== undefined) update.color        = patch.color
    if (patch.notes       !== undefined) update.notes        = patch.notes
    const { data, error } = await supabaseAdmin
      .from('haraka_service_vehicles')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toVehicle(data as Row)
  }
}
