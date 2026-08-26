import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import {
  ReportTemplatesRepository,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from './templates.repository'

const repo = new ReportTemplatesRepository()

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
    await this.getById(tenant, id)
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
