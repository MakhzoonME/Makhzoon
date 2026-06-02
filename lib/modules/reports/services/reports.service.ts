import { NextResponse } from 'next/server';
import { getReportsForOrg } from '@/lib/db/reports';
import { hasPermission } from '@/lib/platform/permissions';
import type { TenantContext } from '@/lib/platform/tenancy/types';

export async function getAll(tenant: TenantContext) {
  if (!hasPermission(tenant, 'reports', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (tenant.subscription?.features && tenant.subscription.features['reports'] === false)
    throw NextResponse.json({ error: 'Reports are not available on your current plan' }, { status: 403 });
  return getReportsForOrg(tenant.organizationId, tenant.spaceId ?? undefined);
}
