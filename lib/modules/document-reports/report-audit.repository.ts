import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { DocumentReportAuditAction, DocumentReportAuditEntry } from '@/types'

type Row = Record<string, unknown>

function toEntry(r: Row): DocumentReportAuditEntry {
  return {
    id:        r.id as string,
    reportId:  r.report_id as string,
    actorId:   (r.actor_id as string) ?? null,
    action:    r.action as DocumentReportAuditAction,
    diff:      (r.diff as Record<string, unknown>) ?? null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
  }
}

export class ReportAuditRepository {
  /** actorId is null for anonymous share-link views/prints — those routes
   *  don't have a TenantContext, hence organizationId is passed explicitly. */
  async record(
    organizationId: string,
    reportId: string,
    action: DocumentReportAuditAction,
    opts?: { actorId?: string | null; diff?: Record<string, unknown> },
  ): Promise<void> {
    const { error } = await supabaseAdmin.from('document_report_audit_log').insert({
      organization_id: organizationId,
      report_id:        reportId,
      actor_id:          opts?.actorId ?? null,
      action,
      diff:              opts?.diff ?? null,
    })
    if (error) throw error
  }

  async listForReport(tenant: TenantContext, reportId: string): Promise<DocumentReportAuditEntry[]> {
    const { data, error } = await supabaseAdmin
      .from('document_report_audit_log')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(toEntry)
  }
}
