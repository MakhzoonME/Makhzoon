import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import {
  ReportTemplatesRepository,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from './templates.repository'
import type { ReportFieldDef, ReportLanguageMode } from '@/types'

const repo = new ReportTemplatesRepository()

/** The zod schema only requires "a name in at least one language" (it can't
 *  see the sibling languageMode); this enforces the mode's actual contract —
 *  'both' needs both names on every field, a single language needs its own. */
function assertFieldsMatchLanguageMode(fields: ReportFieldDef[], mode: ReportLanguageMode) {
  for (const f of fields) {
    const missing =
      mode === 'both' ? (!f.label?.trim() || !f.labelAr?.trim())
      : mode === 'ar'  ? !f.labelAr?.trim()
      :                  !f.label?.trim()
    if (missing) {
      throw NextResponse.json(
        { error: `Field "${f.fieldKey || f.label || f.labelAr}" is missing its ${mode === 'ar' ? 'Arabic' : mode === 'both' ? 'English or Arabic' : 'English'} name` },
        { status: 422 },
      )
    }
  }
}

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'documentReports', 'reportsView')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireManageTemplates(tenant: TenantContext) {
  if (!hasPermission(tenant, 'documentReports', 'reportsManageTemplates')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class ReportTemplatesService {
  async list(tenant: TenantContext, opts?: { activeOnly?: boolean }) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const template = await repo.getById(tenant, id)
    if (!template) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return template
  }

  async create(tenant: TenantContext, input: CreateTemplateInput) {
    requireManageTemplates(tenant)
    assertFieldsMatchLanguageMode(input.fieldSchema, input.languageMode)
    const template = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module:   'documentReports',
      action:   'DOCUMENT_REPORT_TEMPLATE_CREATED',
      recordId: template.id,
      newValue: { name: template.name },
    })
    return template
  }

  async update(tenant: TenantContext, id: string, patch: UpdateTemplateInput) {
    requireManageTemplates(tenant)
    const existing = await this.getById(tenant, id)
    if (patch.fieldSchema) {
      assertFieldsMatchLanguageMode(patch.fieldSchema, patch.languageMode ?? existing.languageMode)
    }
    const template = await repo.update(tenant, id, patch)
    auditLog.queue({
      tenant,
      module:   'documentReports',
      action:   'DOCUMENT_REPORT_TEMPLATE_UPDATED',
      recordId: template.id,
      newValue: { name: template.name, schemaVersion: template.schemaVersion },
    })
    return template
  }
}
