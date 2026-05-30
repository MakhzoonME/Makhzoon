import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/db/audit-logs';
import { hasPermission } from '@/lib/platform/permissions';
import type { TenantContext } from '@/lib/platform/tenancy/types';

export interface AuditLogsParams {
  orgId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function getAll(tenant: TenantContext, params?: AuditLogsParams) {
  if (!hasPermission(tenant, 'auditLogs', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return getAuditLogs({ orgId: tenant.organizationId, spaceId: tenant.spaceId, ...params });
}
