import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { DocumentReportTemplate, ReportFieldDef, ReportLanguageMode } from '@/types'

type Row = Record<string, unknown>

function toTemplate(r: Row): DocumentReportTemplate {
  return {
    id:             r.id as string,
    organizationId: r.organization_id as string,
    name:           r.name as string,
    languageMode:   (r.language_mode as ReportLanguageMode) ?? 'both',
    fieldSchema:    (r.field_schema as ReportFieldDef[]) ?? [],
    schemaVersion:  r.schema_version as number,
    isActive:       r.is_active as boolean,
    createdAt:      r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:      (r.created_by as string) ?? null,
    updatedAt:      r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:      (r.updated_by as string) ?? null,
  }
}

export interface CreateTemplateInput {
  name: string
  languageMode: ReportLanguageMode
  fieldSchema: ReportFieldDef[]
}

export interface UpdateTemplateInput {
  name?: string
  languageMode?: ReportLanguageMode
  fieldSchema?: ReportFieldDef[]
  isActive?: boolean
}

export class ReportTemplatesRepository {
  async list(tenant: TenantContext, opts?: { activeOnly?: boolean }): Promise<DocumentReportTemplate[]> {
    let q = supabaseAdmin
      .from('document_report_templates')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .order('name', { ascending: true })
    if (opts?.activeOnly) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(toTemplate)
  }

  async getById(tenant: TenantContext, id: string): Promise<DocumentReportTemplate | null> {
    const { data } = await supabaseAdmin
      .from('document_report_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || (data as Row).organization_id !== tenant.organizationId) return null
    return toTemplate(data as Row)
  }

  async create(tenant: TenantContext, input: CreateTemplateInput): Promise<DocumentReportTemplate> {
    const { data, error } = await supabaseAdmin
      .from('document_report_templates')
      .insert({
        organization_id: tenant.organizationId,
        name:             input.name,
        language_mode:    input.languageMode,
        field_schema:     input.fieldSchema,
        schema_version:   1,
        created_by:       tenant.userId,
        updated_by:       tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error
    return toTemplate(data as Row)
  }

  /** Bumps schema_version whenever fieldSchema actually changes — old report
   *  instances key their edit-lock off this version, not off content. */
  async update(tenant: TenantContext, id: string, patch: UpdateTemplateInput): Promise<DocumentReportTemplate> {
    const update: Row = { updated_by: tenant.userId }
    if (patch.name         !== undefined) update.name          = patch.name
    if (patch.languageMode !== undefined) update.language_mode = patch.languageMode
    if (patch.isActive     !== undefined) update.is_active     = patch.isActive
    if (patch.fieldSchema !== undefined) {
      // schema_version must be read-then-incremented — done explicitly here
      // rather than in SQL, since PostgREST update() can't reference the
      // existing row. Report instances key their edit-lock off this version.
      const current = await this.getById(tenant, id)
      if (!current) throw new Error('Template not found')
      update.field_schema = patch.fieldSchema
      update.schema_version = current.schemaVersion + 1
    }
    const { data, error } = await supabaseAdmin
      .from('document_report_templates')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toTemplate(data as Row)
  }
}
