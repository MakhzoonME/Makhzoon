import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { HarakaStaffAvailability, HarakaStaffAvailabilityException } from '@/types'

type Row = Record<string, unknown>

/** Postgres returns `time` as 'HH:mm:ss'; the UI and the availability math
 *  both work in 'HH:mm'. */
function toHm(v: unknown): string {
  return String(v ?? '').slice(0, 5)
}

function toAvailability(r: Row): HarakaStaffAvailability {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    staffId: r.staff_id as string,
    dayOfWeek: Number(r.day_of_week ?? 0),
    startTime: toHm(r.start_time),
    endTime: toHm(r.end_time),
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
  }
}

function toException(r: Row): HarakaStaffAvailabilityException {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    staffId: r.staff_id as string,
    exceptionDate: String(r.exception_date ?? '').slice(0, 10),
    startTime: r.start_time ? toHm(r.start_time) : null,
    endTime: r.end_time ? toHm(r.end_time) : null,
    reason: (r.reason as string) ?? null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
  }
}

export interface CreateAvailabilityInput {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface CreateAvailabilityExceptionInput {
  exceptionDate: string
  startTime?: string | null
  endTime?: string | null
  reason?: string | null
}

export class StaffAvailabilityRepository {
  // ── Weekly pattern ──────────────────────────────────────────────────────

  async listWeekly(tenant: TenantContext, staffId: string): Promise<HarakaStaffAvailability[]> {
    const { data, error } = await supabaseAdmin
      .from('haraka_staff_availability')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('staff_id', staffId)
      .order('day_of_week')
      .order('start_time')
    if (error) throw error
    return (data ?? []).map((r) => toAvailability(r as Row))
  }

  async createWeekly(
    tenant: TenantContext,
    staffId: string,
    input: CreateAvailabilityInput,
  ): Promise<HarakaStaffAvailability> {
    const { data, error } = await supabaseAdmin
      .from('haraka_staff_availability')
      .insert({
        organization_id: tenant.organizationId,
        staff_id: staffId,
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        end_time: input.endTime,
        created_by: tenant.userId,
        updated_by: tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error
    return toAvailability(data as Row)
  }

  async deleteWeekly(tenant: TenantContext, staffId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_staff_availability')
      .delete()
      .eq('id', id)
      .eq('staff_id', staffId)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }

  // ── Per-date exceptions ─────────────────────────────────────────────────

  async listExceptions(
    tenant: TenantContext,
    staffId: string,
    opts?: { from?: string; to?: string },
  ): Promise<HarakaStaffAvailabilityException[]> {
    let q = supabaseAdmin
      .from('haraka_staff_availability_exceptions')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('staff_id', staffId)
      .order('exception_date')
    if (opts?.from) q = q.gte('exception_date', opts.from)
    if (opts?.to) q = q.lte('exception_date', opts.to)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map((r) => toException(r as Row))
  }

  /** Upsert on (staff_id, exception_date) — re-submitting a date replaces it
   *  rather than tripping the unique constraint. */
  async upsertException(
    tenant: TenantContext,
    staffId: string,
    input: CreateAvailabilityExceptionInput,
  ): Promise<HarakaStaffAvailabilityException> {
    const { data, error } = await supabaseAdmin
      .from('haraka_staff_availability_exceptions')
      .upsert(
        {
          organization_id: tenant.organizationId,
          staff_id: staffId,
          exception_date: input.exceptionDate,
          start_time: input.startTime ?? null,
          end_time: input.endTime ?? null,
          reason: input.reason ?? null,
          updated_by: tenant.userId,
          created_by: tenant.userId,
        },
        { onConflict: 'staff_id,exception_date' },
      )
      .select('*')
      .single()
    if (error) throw error
    return toException(data as Row)
  }

  async deleteException(tenant: TenantContext, staffId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_staff_availability_exceptions')
      .delete()
      .eq('id', id)
      .eq('staff_id', staffId)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }

  // ── Read path used by the booking conflict check ────────────────────────

  /** The weekly rows for one weekday plus the exception (if any) for one date
   *  — everything `resolveWorkingWindows` needs for a single booking. */
  async getDayRules(
    organizationId: string,
    staffId: string,
    dayOfWeek: number,
    isoDate: string,
  ): Promise<{
    weekly: HarakaStaffAvailability[]
    exception: HarakaStaffAvailabilityException | null
  }> {
    const [weeklyRes, exceptionRes] = await Promise.all([
      supabaseAdmin
        .from('haraka_staff_availability')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('staff_id', staffId)
        .eq('day_of_week', dayOfWeek),
      supabaseAdmin
        .from('haraka_staff_availability_exceptions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('staff_id', staffId)
        .eq('exception_date', isoDate)
        .maybeSingle(),
    ])
    if (weeklyRes.error) throw weeklyRes.error
    return {
      weekly: (weeklyRes.data ?? []).map((r) => toAvailability(r as Row)),
      exception: exceptionRes.data ? toException(exceptionRes.data as Row) : null,
    }
  }
}
