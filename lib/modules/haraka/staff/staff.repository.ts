import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { HarakaStaff, StaffCapability } from '@/types'

type Row = Record<string, unknown>

function toStaff(r: Row): HarakaStaff {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    name: r.name as string,
    phone: (r.phone as string) ?? null,
    notes: (r.notes as string) ?? null,
    // Rows created before migration 0067 backfilled to ['delivery']; the
    // fallback covers a NULL slipping through from an older client.
    capabilities: ((r.capabilities as StaffCapability[]) ?? []) as StaffCapability[],
    isActive: (r.is_active as boolean) ?? true,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? null,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? null,
  }
}

export interface CreateStaffInput {
  name: string
  phone?: string | null
  notes?: string | null
  capabilities?: StaffCapability[]
  isActive?: boolean
}

export interface ListStaffOpts {
  onlyActive?: boolean
  /** Returns only staff whose capabilities array contains this tag. */
  capability?: StaffCapability
}

export class StaffRepository {
  async list(tenant: TenantContext, opts: ListStaffOpts = {}): Promise<HarakaStaff[]> {
    let q = supabaseAdmin
      .from('haraka_staff')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .order('name')
    if (opts.onlyActive) q = q.eq('is_active', true)
    // `contains` on a text[] column compiles to the @> operator, which the
    // GIN index from migration 0067 serves.
    if (opts.capability) q = q.contains('capabilities', [opts.capability])
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map((r) => toStaff(r as Row))
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaStaff | null> {
    const { data } = await supabaseAdmin
      .from('haraka_staff')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || (data as Row).organization_id !== tenant.organizationId) return null
    return toStaff(data as Row)
  }

  async create(tenant: TenantContext, input: CreateStaffInput): Promise<HarakaStaff> {
    const { data, error } = await supabaseAdmin
      .from('haraka_staff')
      .insert({
        organization_id: tenant.organizationId,
        name: input.name,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        capabilities: input.capabilities ?? ['delivery'],
        is_active: input.isActive ?? true,
        created_by: tenant.userId,
        updated_by: tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error
    return toStaff(data as Row)
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: Partial<CreateStaffInput>,
  ): Promise<HarakaStaff> {
    const update: Row = { updated_by: tenant.userId }
    if (patch.name !== undefined) update.name = patch.name
    if (patch.phone !== undefined) update.phone = patch.phone
    if (patch.notes !== undefined) update.notes = patch.notes
    if (patch.capabilities !== undefined) update.capabilities = patch.capabilities
    if (patch.isActive !== undefined) update.is_active = patch.isActive
    const { data, error } = await supabaseAdmin
      .from('haraka_staff')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toStaff(data as Row)
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_staff')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }

  /**
   * Count each staff member's currently-open service jobs (status not
   * done/cancelled). Feeds balanced-routing selection — staff not present in
   * the result have zero open jobs.
   */
  async openJobCounts(tenant: TenantContext, staffIds: string[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    if (staffIds.length === 0) return counts

    const { data, error } = await supabaseAdmin
      .from('haraka_service_job_agents')
      .select('staff_id, haraka_service_jobs!inner(status, organization_id)')
      .in('staff_id', staffIds)
      .eq('haraka_service_jobs.organization_id', tenant.organizationId)
      .in('haraka_service_jobs.status', ['new', 'confirmed', 'in_progress'])

    if (error) throw error
    for (const row of (data ?? []) as unknown as { staff_id: string }[]) {
      counts[row.staff_id] = (counts[row.staff_id] ?? 0) + 1
    }
    return counts
  }
}
