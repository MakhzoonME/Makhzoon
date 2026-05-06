import { NextResponse } from 'next/server';
import { getReportsForOrg } from '@/lib/db/reports';
import { hasPermission } from '@/lib/platform/permissions';
import type { TenantContext } from '@/lib/platform/tenancy/types';

export async function getAll(tenant: TenantContext) {
  if (!hasPermission(tenant, 'reports', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return getReportsForOrg(tenant.organizationId);
}
