import 'server-only'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  DocumentReportInstance,
  ReportAttachment,
  ReportEncounterType,
  ReportFieldDef,
} from '@/types'

type Row = Record<string, unknown>

function toInstance(r: Row, currentTemplateSchemaVersion: number, templateName: string): DocumentReportInstance {
  const templateSchemaVersion = r.template_schema_version as number
  return {
    id:                    r.id as string,
    organizationId:        r.organization_id as string,
    templateId:            r.template_id as string,
    templateName,
    customerId:            r.customer_id as string,
    encounterType:         r.encounter_type as ReportEncounterType,
    encounterId:           r.encounter_id as string,
    templateSchemaVersion,
    fieldSchemaSnapshot:   (r.field_schema_snapshot as ReportFieldDef[]) ?? [],
    fieldValues:           (r.field_values as Record<string, unknown>) ?? {},
    attachments:           (r.attachments as ReportAttachment[]) ?? [],
    shareToken:            r.share_token as string,
    isEditable:            templateSchemaVersion === currentTemplateSchemaVersion,
    createdAt:             r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:             (r.created_by as string) ?? null,
    updatedAt:             r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:             (r.updated_by as string) ?? null,
  }
}

export interface CreateInstanceInput {
  templateId: string
  customerId: string
  encounterType: ReportEncounterType
  encounterId: string
  fieldValues: Record<string, unknown>
  attachments: ReportAttachment[]
}

export interface ListInstancesOpts {
  customerId?: string
  templateId?: string
  encounterType?: ReportEncounterType
  encounterId?: string
  page?: number
  pageSize?: number
}

export class ReportInstancesRepository {
  async list(tenant: TenantContext, opts?: ListInstancesOpts): Promise<{ items: DocumentReportInstance[]; total: number }> {
    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 50
    let q = supabaseAdmin
      .from('document_report_instances')
      .select('*, document_report_templates(name, schema_version)', { count: 'exact' })
      .eq('organization_id', tenant.organizationId)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)
    if (opts?.customerId)     q = q.eq('customer_id', opts.customerId)
    if (opts?.templateId)     q = q.eq('template_id', opts.templateId)
    if (opts?.encounterType)  q = q.eq('encounter_type', opts.encounterType)
    if (opts?.encounterId)    q = q.eq('encounter_id', opts.encounterId)
    const { data, error, count } = await q
    if (error) throw error
    const items = (data ?? []).map((row) => {
      const r = row as Row & { document_report_templates: { name: string; schema_version: number } | null }
      const tpl = r.document_report_templates
      return toInstance(r, tpl?.schema_version ?? (r.template_schema_version as number), tpl?.name ?? '')
    })
    return { items, total: count ?? items.length }
  }

  async getById(tenant: TenantContext, id: string): Promise<DocumentReportInstance | null> {
    const { data } = await supabaseAdmin
      .from('document_report_instances')
      .select('*, document_report_templates(name, schema_version)')
      .eq('id', id)
      .maybeSingle()
    if (!data || (data as Row).organization_id !== tenant.organizationId) return null
    const r = data as Row & { document_report_templates: { name: string; schema_version: number } | null }
    const tpl = r.document_report_templates
    return toInstance(r, tpl?.schema_version ?? (r.template_schema_version as number), tpl?.name ?? '')
  }

  async getByShareToken(shareToken: string): Promise<DocumentReportInstance | null> {
    const { data } = await supabaseAdmin
      .from('document_report_instances')
      .select('*, document_report_templates(name, schema_version)')
      .eq('share_token', shareToken)
      .maybeSingle()
    if (!data) return null
    const r = data as Row & { document_report_templates: { name: string; schema_version: number } | null }
    const tpl = r.document_report_templates
    return toInstance(r, tpl?.schema_version ?? (r.template_schema_version as number), tpl?.name ?? '')
  }

  /** Creates an instance with a frozen field_schema_snapshot taken from the
   *  template's *current* schema — later template edits never retroactively
   *  change this report's rendering or its own edit-lock version. */
  async create(
    tenant: TenantContext,
    input: CreateInstanceInput,
    template: { schemaVersion: number; fieldSchema: ReportFieldDef[]; name: string },
  ): Promise<DocumentReportInstance> {
    const shareToken = randomBytes(32).toString('hex')
    const { data, error } = await supabaseAdmin
      .from('document_report_instances')
      .insert({
        organization_id:          tenant.organizationId,
        template_id:               input.templateId,
        customer_id:                input.customerId,
        encounter_type:             input.encounterType,
        encounter_id:               input.encounterId,
        template_schema_version:    template.schemaVersion,
        field_schema_snapshot:      template.fieldSchema,
        field_values:               input.fieldValues,
        attachments:                input.attachments,
        share_token:                shareToken,
        created_by:                 tenant.userId,
        updated_by:                 tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error
    return toInstance(data as Row, template.schemaVersion, template.name)
  }

  /** Updates field_values/attachments in place. Caller must have already
   *  verified isEditable (template_schema_version still current) — enforced
   *  in the service layer, not here. */
  async update(
    tenant: TenantContext,
    id: string,
    patch: { fieldValues?: Record<string, unknown>; attachments?: ReportAttachment[] },
  ): Promise<DocumentReportInstance> {
    const update: Row = { updated_by: tenant.userId }
    if (patch.fieldValues !== undefined) update.field_values = patch.fieldValues
    if (patch.attachments !== undefined) update.attachments = patch.attachments
    const { data, error } = await supabaseAdmin
      .from('document_report_instances')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*, document_report_templates(name, schema_version)')
      .single()
    if (error) throw error
    const r = data as Row & { document_report_templates: { name: string; schema_version: number } | null }
    const tpl = r.document_report_templates
    return toInstance(r, tpl?.schema_version ?? (r.template_schema_version as number), tpl?.name ?? '')
  }
}
