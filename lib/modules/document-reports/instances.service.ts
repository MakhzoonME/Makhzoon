import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import {
  ReportInstancesRepository,
  type CreateInstanceInput,
  type ListInstancesOpts,
} from './instances.repository'
import { ReportTemplatesRepository } from './templates.repository'
import { ReportAuditRepository } from './report-audit.repository'
import type { ReportAttachment } from '@/types'

const repo = new ReportInstancesRepository()
const templatesRepo = new ReportTemplatesRepository()
const reportAudit = new ReportAuditRepository()

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'documentReports', 'reportsView')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireCreate(tenant: TenantContext) {
  if (!hasPermission(tenant, 'documentReports', 'reportsCreate')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireEdit(tenant: TenantContext) {
  if (!hasPermission(tenant, 'documentReports', 'reportsEdit')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

/** Shallow diff of only the keys present in `patch`, for the audit log. */
function diffFieldValues(before: Record<string, unknown>, patch: Record<string, unknown>) {
  const changed: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of Object.keys(patch)) {
    if (before[key] !== patch[key]) changed[key] = { from: before[key] ?? null, to: patch[key] }
  }
  return changed
}

export class ReportInstancesService {
  async list(tenant: TenantContext, opts?: ListInstancesOpts) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const report = await repo.getById(tenant, id)
    if (!report) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return report
  }

  async create(tenant: TenantContext, input: CreateInstanceInput) {
    requireCreate(tenant)
    const template = await templatesRepo.getById(tenant, input.templateId)
    if (!template) throw NextResponse.json({ error: 'Template not found' }, { status: 404 })
    if (!template.isActive) {
      throw NextResponse.json({ error: 'This template is no longer active' }, { status: 422 })
    }
    const report = await repo.create(tenant, input, {
      schemaVersion: template.schemaVersion,
      fieldSchema:   template.fieldSchema,
      name:          template.name,
    })
    await reportAudit.record(tenant.organizationId, report.id, 'created', { actorId: tenant.userId })
    auditLog.queue({
      tenant,
      module:   'documentReports',
      action:   'DOCUMENT_REPORT_CREATED',
      recordId: report.id,
      newValue: { templateId: template.id, templateName: template.name, customerId: report.customerId },
    })
    return report
  }

  /** Rejects the edit with a 409 + reason when the template has moved on to
   *  a newer schema_version since this report was created — the report stays
   *  fully viewable/printable/shareable either way, only editing locks. */
  async update(tenant: TenantContext, id: string, patch: { fieldValues?: Record<string, unknown>; attachments?: ReportAttachment[] }) {
    requireEdit(tenant)
    const existing = await this.getById(tenant, id)
    if (!existing.isEditable) {
      throw NextResponse.json(
        {
          error: "This report's template has been updated since this report was created. Editing is locked to preserve the original record — create a new report to use the current template.",
          code: 'REPORT_TEMPLATE_STALE',
        },
        { status: 409 },
      )
    }
    const diff = patch.fieldValues ? diffFieldValues(existing.fieldValues, patch.fieldValues) : {}
    const report = await repo.update(tenant, id, patch)
    if (Object.keys(diff).length > 0) {
      await reportAudit.record(tenant.organizationId, report.id, 'edited', { actorId: tenant.userId, diff })
    }
    auditLog.queue({
      tenant,
      module:   'documentReports',
      action:   'DOCUMENT_REPORT_UPDATED',
      recordId: report.id,
      newValue: diff,
    })
    return report
  }

  /** Public, no-login lookup for the share page — no permission check, no
   *  tenant. Records an anonymous 'viewed' entry. */
  async getByShareToken(token: string) {
    const report = await repo.getByShareToken(token)
    if (!report) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    await reportAudit.record(report.organizationId, report.id, 'viewed', { actorId: null })
    return report
  }

  async recordPrinted(tenant: TenantContext | null, organizationId: string, reportId: string) {
    await reportAudit.record(organizationId, reportId, 'printed', { actorId: tenant?.userId ?? null })
  }

  async recordShared(tenant: TenantContext, reportId: string) {
    await reportAudit.record(tenant.organizationId, reportId, 'shared', { actorId: tenant.userId })
  }
}
