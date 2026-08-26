import 'server-only'

import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ZeyaraVisit } from '@/types'
import { uploadToStorage } from '@/lib/storage/upload'
import { VisitsRepository, type ListVisitsOpts } from './visits.repository'
import { ALLOWED_ATTACHMENT_MIME, MAX_ATTACHMENT_BYTES } from './schemas'

const repo = new VisitsRepository()

type Row = Record<string, unknown>

/**
 * Clinical operations live ONLY in the Zeyara namespace — unlike bookings,
 * catalog, and patients, they have no Haraka counterpart, so there is nothing
 * to OR against and hasVerticalPermission() would be misleading here. A Haraka
 * org cannot reach clinical records at all, which is the intent.
 */
function requireOp(
  tenant: TenantContext,
  op:
    | 'visitsView'
    | 'visitsCreate'
    | 'visitsUpdate'
    | 'visitsDelete'
    | 'visitNotesCreate'
    | 'visitAttachmentsUpload'
    | 'visitAttachmentsDelete'
    | 'followUpsView',
) {
  if (!hasPermission(tenant, 'zeyara', op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function badRequest(error: string, extra?: Record<string, unknown>): never {
  throw NextResponse.json({ error, ...extra }, { status: 400 })
}

// Single source of truth with the route's zod schema — the API and the
// service must not be able to disagree about what is attachable.
const ALLOWED_MIME = new Set<string>(ALLOWED_ATTACHMENT_MIME)

export class VisitsService {
  async list(tenant: TenantContext, opts?: ListVisitsOpts) {
    requireOp(tenant, 'visitsView')
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string): Promise<ZeyaraVisit> {
    requireOp(tenant, 'visitsView')
    const visit = await repo.getById(tenant, id)
    if (!visit) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return visit
  }

  async getByAppointmentId(tenant: TenantContext, appointmentId: string): Promise<ZeyaraVisit | null> {
    requireOp(tenant, 'visitsView')
    return repo.getByAppointmentId(tenant, appointmentId)
  }

  /**
   * Opens the clinical record for an appointment. The patient and provider are
   * copied from the appointment rather than accepted from the caller — the
   * booking is the authority on who was seen and by whom, and letting the two
   * disagree is how a record ends up attached to the wrong patient.
   */
  async create(
    tenant: TenantContext,
    input: {
      appointmentId: string
      visitDate?: string | null
      chiefComplaint?: string | null
      findings?: string | null
      diagnosis?: string | null
      treatmentPlan?: string | null
      followUpDue?: string | null
    },
  ): Promise<ZeyaraVisit> {
    requireOp(tenant, 'visitsCreate')

    const { data: apptRow } = await supabaseAdmin
      .from('haraka_appointments')
      .select('id, organization_id, customer_id, customer_name, staff_id, scheduled_at')
      .eq('id', input.appointmentId)
      .maybeSingle()

    const appt = apptRow as Row | null
    if (!appt || appt.organization_id !== tenant.organizationId) {
      badRequest('Appointment not found')
    }

    // One clinical record per appointment (enforced by a unique index too —
    // this check turns the DB error into a message the form can show).
    const existing = await repo.getByAppointmentId(tenant, input.appointmentId)
    if (existing) {
      badRequest('This appointment already has a clinical record', {
        code: 'VISIT_EXISTS',
        visitId: existing.id,
      })
    }

    let providerName: string | null = null
    if (appt.staff_id) {
      const { data: staff } = await supabaseAdmin
        .from('haraka_staff')
        .select('name')
        .eq('id', appt.staff_id as string)
        .maybeSingle()
      providerName = ((staff as Row | null)?.name as string) ?? null
    }

    const visit = await repo.create(tenant, {
      appointmentId:   input.appointmentId,
      customerId:      (appt.customer_id as string) ?? null,
      patientName:     (appt.customer_name as string) ?? 'Unknown',
      providerId:      (appt.staff_id as string) ?? null,
      providerName,
      visitDate:       input.visitDate ?? (appt.scheduled_at as string) ?? new Date().toISOString(),
      chiefComplaint:  input.chiefComplaint ?? null,
      findings:        input.findings ?? null,
      diagnosis:       input.diagnosis ?? null,
      treatmentPlan:   input.treatmentPlan ?? null,
      followUpDue:     input.followUpDue ?? null,
    })

    // Clinical content is deliberately NOT copied into the audit payload —
    // the audit trail records that a record was opened and by whom, not the
    // patient's diagnosis.
    auditLog.queue({
      tenant,
      module:   'zeyara',
      action:   'VISIT_CREATED',
      recordId: visit.id,
      newValue: {
        visitNumber:   visit.visitNumber,
        appointmentId: visit.appointmentId,
        providerId:    visit.providerId,
      },
    })
    return visit
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: {
      visitDate?: string | null
      chiefComplaint?: string | null
      findings?: string | null
      diagnosis?: string | null
      treatmentPlan?: string | null
      followUpDue?: string | null
    },
  ): Promise<ZeyaraVisit> {
    requireOp(tenant, 'visitsUpdate')
    await this.getById(tenant, id)
    const visit = await repo.update(tenant, id, patch)
    auditLog.queue({
      tenant,
      module:   'zeyara',
      action:   'VISIT_UPDATED',
      recordId: id,
      // Field NAMES only — never the clinical values.
      newValue: { fieldsChanged: Object.keys(patch) },
    })
    return visit
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    requireOp(tenant, 'visitsDelete')
    const visit = await this.getById(tenant, id)
    await repo.delete(tenant, id)
    auditLog.queue({
      tenant,
      module:   'zeyara',
      action:   'VISIT_DELETED',
      recordId: id,
      oldValue: { visitNumber: visit.visitNumber, appointmentId: visit.appointmentId },
    })
  }

  // ── Notes ───────────────────────────────────────────────────────────────

  async listNotes(tenant: TenantContext, visitId: string) {
    requireOp(tenant, 'visitsView')
    await this.getById(tenant, visitId)
    return repo.listNotes(tenant, visitId)
  }

  /** Append-only: there is no updateNote / deleteNote by design (§5.2). */
  async addNote(tenant: TenantContext, visitId: string, body: string) {
    requireOp(tenant, 'visitNotesCreate')
    await this.getById(tenant, visitId)
    const note = await repo.addNote(tenant, visitId, body)
    auditLog.queue({
      tenant,
      module:   'zeyara',
      action:   'VISIT_NOTE_ADDED',
      recordId: visitId,
      newValue: { noteId: note.id },
    })
    return note
  }

  // ── Attachments ─────────────────────────────────────────────────────────

  async listAttachments(tenant: TenantContext, visitId: string) {
    requireOp(tenant, 'visitsView')
    await this.getById(tenant, visitId)
    return repo.listAttachments(tenant, visitId)
  }

  async addAttachment(tenant: TenantContext, visitId: string, file: File) {
    requireOp(tenant, 'visitAttachmentsUpload')
    const visit = await this.getById(tenant, visitId)

    if (file.size > MAX_ATTACHMENT_BYTES) {
      badRequest('That file is larger than the 20 MB limit')
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      badRequest(`'${file.type}' files can't be attached to a clinical record`)
    }

    const uploaded = await uploadToStorage({
      kind:        'zeyara-visit-file',
      // Scoped per visit so a clinical file never shares a prefix with
      // another patient's record.
      ownerId:     `${tenant.organizationId}/${visit.id}`,
      filename:    file.name,
      contentType: file.type || 'application/octet-stream',
      buffer:      await file.arrayBuffer(),
    })

    const attachment = await repo.addAttachment(tenant, visitId, {
      bucket:    uploaded.bucket,
      path:      uploaded.path,
      name:      uploaded.name,
      mimeType:  file.type || null,
      sizeBytes: file.size,
    })

    auditLog.queue({
      tenant,
      module:   'zeyara',
      action:   'VISIT_ATTACHMENT_ADDED',
      recordId: visitId,
      newValue: { attachmentId: attachment.id, fileName: attachment.fileName },
    })
    return attachment
  }

  async deleteAttachment(tenant: TenantContext, visitId: string, attachmentId: string) {
    requireOp(tenant, 'visitAttachmentsDelete')
    await this.getById(tenant, visitId)
    const existing = await repo.getAttachment(tenant, attachmentId)
    if (!existing || existing.visitId !== visitId) {
      throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await repo.deleteAttachment(tenant, attachmentId)
    auditLog.queue({
      tenant,
      module:   'zeyara',
      action:   'VISIT_ATTACHMENT_DELETED',
      recordId: visitId,
      oldValue: { attachmentId, fileName: existing.fileName },
    })
  }

  // ── Follow-ups ──────────────────────────────────────────────────────────

  async listFollowUps(
    tenant: TenantContext,
    opts?: { through?: string; page?: number; pageSize?: number },
  ) {
    requireOp(tenant, 'followUpsView')
    return repo.listFollowUps(tenant, opts)
  }
}
