import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  ZeyaraVisit,
  ZeyaraVisitNote,
  ZeyaraVisitAttachment,
  ZeyaraFollowUp,
} from '@/types'
import { getSignedUrl } from '@/lib/storage/upload'
import { allocateVisitNumber } from './visit-numbering'

type Row = Record<string, unknown>

function toVisit(r: Row): ZeyaraVisit {
  return {
    id:              r.id as string,
    organizationId:  r.organization_id as string,
    spaceId:         (r.space_id as string) ?? null,
    visitNumber:     r.visit_number as string,
    appointmentId:   r.appointment_id as string,

    customerId:      (r.customer_id as string) ?? null,
    patientName:     r.patient_name as string,
    providerId:      (r.provider_id as string) ?? null,
    providerName:    (r.provider_name as string) ?? null,

    visitDate:       r.visit_date ? new Date(r.visit_date as string) : new Date(),

    chiefComplaint:  (r.chief_complaint as string) ?? null,
    findings:        (r.findings as string) ?? null,
    diagnosis:       (r.diagnosis as string) ?? null,
    treatmentPlan:   (r.treatment_plan as string) ?? null,
    followUpDue:     (r.follow_up_due as string) ?? null,

    createdAt:       r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:       (r.created_by as string) ?? null,
    createdByName:   (r.created_by_name as string) ?? null,
    updatedAt:       r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:       (r.updated_by as string) ?? null,
    updatedByName:   (r.updated_by_name as string) ?? null,
  }
}

function toNote(r: Row): ZeyaraVisitNote {
  return {
    id:             r.id as string,
    visitId:        r.visit_id as string,
    organizationId: r.organization_id as string,
    body:           r.body as string,
    authorId:       (r.author_id as string) ?? null,
    authorName:     (r.author_name as string) ?? null,
    createdAt:      r.created_at ? new Date(r.created_at as string) : new Date(),
  }
}

function toAttachment(r: Row): ZeyaraVisitAttachment {
  return {
    id:             r.id as string,
    visitId:        r.visit_id as string,
    organizationId: r.organization_id as string,
    bucket:         r.bucket as string,
    storagePath:    r.storage_path as string,
    fileName:       r.file_name as string,
    mimeType:       (r.mime_type as string) ?? null,
    sizeBytes:      r.size_bytes == null ? null : Number(r.size_bytes),
    uploadedBy:     (r.uploaded_by as string) ?? null,
    uploadedByName: (r.uploaded_by_name as string) ?? null,
    createdAt:      r.created_at ? new Date(r.created_at as string) : new Date(),
  }
}

export interface ListVisitsOpts {
  customerId?: string
  providerId?: string
  appointmentId?: string
  /** ISO instants — half-open [from, to). */
  from?: string
  to?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface CreateVisitInput {
  appointmentId:   string
  customerId:      string | null
  patientName:     string
  providerId:      string | null
  providerName:    string | null
  visitDate:       string
  chiefComplaint?: string | null
  findings?:       string | null
  diagnosis?:      string | null
  treatmentPlan?:  string | null
  followUpDue?:    string | null
}

export interface UpdateVisitInput {
  visitDate?:      string | null
  chiefComplaint?: string | null
  findings?:       string | null
  diagnosis?:      string | null
  treatmentPlan?:  string | null
  followUpDue?:    string | null
}

export class VisitsRepository {
  /** Attach the parent appointment's number for display, in one round trip. */
  private async enrichAppointmentNumbers(visits: ZeyaraVisit[]): Promise<void> {
    if (visits.length === 0) return
    const ids = [...new Set(visits.map((v) => v.appointmentId))]
    const { data } = await supabaseAdmin
      .from('haraka_appointments')
      .select('id, appointment_number')
      .in('id', ids)
    const numbers = new Map<string, string>()
    for (const a of (data ?? []) as Row[]) {
      numbers.set(a.id as string, a.appointment_number as string)
    }
    for (const v of visits) {
      v.appointmentNumber = numbers.get(v.appointmentId) ?? null
    }
  }

  async list(tenant: TenantContext, opts?: ListVisitsOpts) {
    let q = supabaseAdmin
      .from('zeyara_visits')
      .select('*', { count: 'exact' })
      .eq('organization_id', tenant.organizationId)
    if (tenant.spaceId) q = q.eq('space_id', tenant.spaceId)
    if (opts?.customerId) q = q.eq('customer_id', opts.customerId)
    if (opts?.providerId) q = q.eq('provider_id', opts.providerId)
    if (opts?.appointmentId) q = q.eq('appointment_id', opts.appointmentId)
    if (opts?.from) q = q.gte('visit_date', opts.from)
    if (opts?.to) q = q.lt('visit_date', opts.to)
    if (opts?.search) {
      const term = `%${opts.search}%`
      q = q.or(`patient_name.ilike.${term},visit_number.ilike.${term},diagnosis.ilike.${term}`)
    }

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 25
    const from = (Math.max(1, page) - 1) * pageSize
    const { data, count, error } = await q
      .order('visit_date', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw error

    const items = (data ?? []).map((r) => toVisit(r as Row))
    await this.enrichAppointmentNumbers(items)

    const total = count ?? 0
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async getById(tenant: TenantContext, id: string): Promise<ZeyaraVisit | null> {
    const { data } = await supabaseAdmin
      .from('zeyara_visits')
      .select('*')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    if (!data) return null
    const visit = toVisit(data as Row)
    await this.enrichAppointmentNumbers([visit])
    return visit
  }

  /** The one visit pinned to this appointment, if the record was opened. */
  async getByAppointmentId(tenant: TenantContext, appointmentId: string): Promise<ZeyaraVisit | null> {
    const { data } = await supabaseAdmin
      .from('zeyara_visits')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    return data ? toVisit(data as Row) : null
  }

  async create(tenant: TenantContext, input: CreateVisitInput): Promise<ZeyaraVisit> {
    const visitNumber = await allocateVisitNumber(tenant.organizationId, tenant.spaceId)
    const { data, error } = await supabaseAdmin
      .from('zeyara_visits')
      .insert({
        organization_id: tenant.organizationId,
        space_id:        tenant.spaceId ?? null,
        visit_number:    visitNumber,
        appointment_id:  input.appointmentId,
        customer_id:     input.customerId,
        patient_name:    input.patientName,
        provider_id:     input.providerId,
        provider_name:   input.providerName,
        visit_date:      input.visitDate,
        chief_complaint: input.chiefComplaint ?? null,
        findings:        input.findings ?? null,
        diagnosis:       input.diagnosis ?? null,
        treatment_plan:  input.treatmentPlan ?? null,
        follow_up_due:   input.followUpDue ?? null,
        created_by:      tenant.userId,
        created_by_name: tenant.user?.displayName ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return toVisit(data as Row)
  }

  async update(tenant: TenantContext, id: string, patch: UpdateVisitInput): Promise<ZeyaraVisit> {
    const row: Row = {
      updated_by:      tenant.userId,
      updated_by_name: tenant.user?.displayName ?? null,
    }
    if (patch.visitDate !== undefined)      row.visit_date      = patch.visitDate
    if (patch.chiefComplaint !== undefined) row.chief_complaint = patch.chiefComplaint
    if (patch.findings !== undefined)       row.findings        = patch.findings
    if (patch.diagnosis !== undefined)      row.diagnosis       = patch.diagnosis
    if (patch.treatmentPlan !== undefined)  row.treatment_plan  = patch.treatmentPlan
    if (patch.followUpDue !== undefined)    row.follow_up_due   = patch.followUpDue

    const { data, error } = await supabaseAdmin
      .from('zeyara_visits')
      .update(row)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toVisit(data as Row)
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('zeyara_visits')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }

  // ── Notes (append-only) ─────────────────────────────────────────────────

  async listNotes(tenant: TenantContext, visitId: string): Promise<ZeyaraVisitNote[]> {
    const { data, error } = await supabaseAdmin
      .from('zeyara_visit_notes')
      .select('*')
      .eq('visit_id', visitId)
      .eq('organization_id', tenant.organizationId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => toNote(r as Row))
  }

  async addNote(tenant: TenantContext, visitId: string, body: string): Promise<ZeyaraVisitNote> {
    const { data, error } = await supabaseAdmin
      .from('zeyara_visit_notes')
      .insert({
        visit_id:        visitId,
        organization_id: tenant.organizationId,
        body,
        author_id:       tenant.userId,
        author_name:     tenant.user?.displayName ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return toNote(data as Row)
  }

  // ── Attachments ─────────────────────────────────────────────────────────

  /** Signs every attachment for reading — the bucket is private, so a stored
   *  path is useless to the browser on its own. */
  async listAttachments(tenant: TenantContext, visitId: string): Promise<ZeyaraVisitAttachment[]> {
    const { data, error } = await supabaseAdmin
      .from('zeyara_visit_attachments')
      .select('*')
      .eq('visit_id', visitId)
      .eq('organization_id', tenant.organizationId)
      .order('created_at', { ascending: false })
    if (error) throw error

    const items = (data ?? []).map((r) => toAttachment(r as Row))
    await Promise.all(
      items.map(async (a) => {
        try {
          a.url = await getSignedUrl(a.bucket, a.storagePath, 60 * 60)
        } catch {
          // A missing object must not blank the whole record — the row still
          // renders, just without a working link.
          a.url = undefined
        }
      }),
    )
    return items
  }

  async addAttachment(
    tenant: TenantContext,
    visitId: string,
    file: { bucket: string; path: string; name: string; mimeType: string | null; sizeBytes: number | null },
  ): Promise<ZeyaraVisitAttachment> {
    const { data, error } = await supabaseAdmin
      .from('zeyara_visit_attachments')
      .insert({
        visit_id:         visitId,
        organization_id:  tenant.organizationId,
        bucket:           file.bucket,
        storage_path:     file.path,
        file_name:        file.name,
        mime_type:        file.mimeType,
        size_bytes:       file.sizeBytes,
        uploaded_by:      tenant.userId,
        uploaded_by_name: tenant.user?.displayName ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return toAttachment(data as Row)
  }

  async getAttachment(tenant: TenantContext, attachmentId: string): Promise<ZeyaraVisitAttachment | null> {
    const { data } = await supabaseAdmin
      .from('zeyara_visit_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    return data ? toAttachment(data as Row) : null
  }

  async deleteAttachment(tenant: TenantContext, attachmentId: string): Promise<void> {
    const existing = await this.getAttachment(tenant, attachmentId)
    if (!existing) return
    // Remove the row first: an orphaned storage object is recoverable waste,
    // while a row pointing at a deleted object is a broken record.
    const { error } = await supabaseAdmin
      .from('zeyara_visit_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
    await supabaseAdmin.storage.from(existing.bucket).remove([existing.storagePath])
  }

  // ── Follow-ups ──────────────────────────────────────────────────────────

  /**
   * Patients due back on or before `through`, soonest first. Drives both the
   * follow-ups queue in the UI and the Phase 4 reminder sweep.
   */
  async listFollowUps(
    tenant: TenantContext,
    opts?: { through?: string; page?: number; pageSize?: number },
  ) {
    const through = opts?.through ?? new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
    let q = supabaseAdmin
      .from('zeyara_visits')
      .select('*', { count: 'exact' })
      .eq('organization_id', tenant.organizationId)
      .not('follow_up_due', 'is', null)
      .lte('follow_up_due', through)
    if (tenant.spaceId) q = q.eq('space_id', tenant.spaceId)

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 50
    const from = (Math.max(1, page) - 1) * pageSize
    const { data, count, error } = await q
      .order('follow_up_due', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const items: ZeyaraFollowUp[] = (data ?? []).map((raw) => {
      const v = toVisit(raw as Row)
      const due = new Date(`${v.followUpDue}T00:00:00`)
      return {
        visitId:       v.id,
        visitNumber:   v.visitNumber,
        customerId:    v.customerId,
        patientName:   v.patientName,
        providerName:  v.providerName,
        followUpDue:   v.followUpDue as string,
        daysUntilDue:  Math.round((due.getTime() - today.getTime()) / 86_400_000),
        lastVisitDate: v.visitDate,
      }
    })

    const total = count ?? 0
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }
}
