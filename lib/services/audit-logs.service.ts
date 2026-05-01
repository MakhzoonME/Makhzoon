import { AuthUser } from '@/types/auth.types';
import { getAuditLogs } from '@/lib/db/audit-logs';
import { requirePermission } from './base.service';

export interface AuditLogsParams {
  module?: string;
  action?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export async function getOrgAuditLogs(user: AuthUser, params?: AuditLogsParams) {
  await requirePermission(user, 'audit-logs', 'view');
  return getAuditLogs(user.organizationId, params);
}

