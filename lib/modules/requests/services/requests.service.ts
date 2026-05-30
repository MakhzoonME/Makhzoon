import { NextResponse } from 'next/server';
import {
  getRequests,
  getRequestById,
  createRequest as dbCreateRequest,
  updateRequest as dbUpdateRequest,
} from '@/lib/db/requests';
import { hasPermission } from '@/lib/platform/permissions';
import { auditLog } from '@/lib/platform/audit';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import { checkResourceLimit } from '@/lib/platform/limits/check-limit';

export interface CreateRequestInput {
  type: 'REFILL' | 'RETIRE' | 'BUY_NEW' | 'EXTEND_WARRANTY';
  assetId?: string;
  warrantyId?: string;
  inventoryItemId?: string;
  description: string;
}

export async function getAll(tenant: TenantContext, filters?: Parameters<typeof getRequests>[1]) {
  if (!hasPermission(tenant, 'requests', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return getRequests(tenant.organizationId, { ...filters, spaceId: tenant.spaceId });
}

export async function getById(tenant: TenantContext, requestId: string) {
  if (!hasPermission(tenant, 'requests', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const request = await getRequestById(requestId);
  if (!request || request.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'Request not found' }, { status: 404 });
  return request;
}

export async function create(tenant: TenantContext, data: CreateRequestInput) {
  if (!hasPermission(tenant, 'requests', 'create'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (tenant.subscription?.status && tenant.subscription.status !== 'ACTIVE')
    throw NextResponse.json({ error: 'Subscription expired' }, { status: 403 });
  await checkResourceLimit(tenant, 'requests');

  const id = await dbCreateRequest({
    organizationId: tenant.organizationId,
    spaceId: tenant.spaceId,
    ...data,
    status: 'PENDING',
    createdBy: tenant.userId,
    createdByName: tenant.user.displayName || undefined,
    createdByEmail: tenant.user.email || undefined,
    updatedBy: tenant.userId,
  });

  auditLog.queue({
    tenant,
    action: 'REQUEST_SUBMITTED',
    module: 'requests',
    recordId: id,
    newValue: data as unknown as Record<string, unknown>,
  });

  return { id };
}

export async function approve(tenant: TenantContext, requestId: string) {
  if (!hasPermission(tenant, 'requests', 'approve'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const request = await getRequestById(requestId);
  if (!request || request.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'Request not found' }, { status: 404 });

  await dbUpdateRequest(requestId, {
    status: 'APPROVED',
    decisionBy: tenant.userId,
    decisionAt: new Date(),
    updatedBy: tenant.userId,
  });

  auditLog.queue({
    tenant,
    action: 'REQUEST_APPROVED',
    module: 'requests',
    recordId: requestId,
    oldValue: { status: request.status },
    newValue: { status: 'APPROVED' },
  });

  return request;
}

export async function reject(tenant: TenantContext, requestId: string) {
  if (!hasPermission(tenant, 'requests', 'approve'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const request = await getRequestById(requestId);
  if (!request || request.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'Request not found' }, { status: 404 });

  await dbUpdateRequest(requestId, {
    status: 'REJECTED',
    decisionBy: tenant.userId,
    decisionAt: new Date(),
    updatedBy: tenant.userId,
  });

  auditLog.queue({
    tenant,
    action: 'REQUEST_REJECTED',
    module: 'requests',
    recordId: requestId,
    oldValue: { status: request.status },
    newValue: { status: 'REJECTED' },
  });
}
