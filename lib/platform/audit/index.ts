import { writeAuditLog, queueAuditLog, type AuditAction } from '@/lib/audit/logger'
import type { TenantContext } from '@/lib/platform/tenancy/types'

interface AuditCreateParams {
  tenant: TenantContext
  module: string
  action: AuditAction
  recordId?: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
}

export const auditLog = {
  async create({ tenant, module, action, recordId, oldValue, newValue }: AuditCreateParams) {
    await writeAuditLog({
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      role: tenant.role,
      action,
      module,
      recordId,
      oldValue: oldValue ?? undefined,
      newValue: newValue ?? undefined,
    })
  },
  queue({ tenant, module, action, recordId, oldValue, newValue }: AuditCreateParams) {
    queueAuditLog({
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      role: tenant.role,
      action,
      module,
      recordId,
      oldValue: oldValue ?? undefined,
      newValue: newValue ?? undefined,
    })
  },
}
