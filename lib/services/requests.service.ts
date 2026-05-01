import { AuthUser } from '@/types/auth.types';
import {
  getRequests,
  getRequestById,
  createRequest as dbCreateRequest,
  approveRequest as dbApproveRequest,
  rejectRequest as dbRejectRequest,
} from '@/lib/db/requests';
import { writeAuditLog } from '@/lib/audit/logger';
import { requirePermission, requireActiveSubscription, getUserContext } from './base.service';

export interface CreateRequestInput {
  type: 'REFILL' | 'RETIRE' | 'BUY_NEW' | 'EXTEND_WARRANTY';
  assetId?: string;
  warrantyId?: string;
  inventoryItemId?: string;
  description: string;
}

export async function getOrgRequests(user: AuthUser, filters?: { status?: string; type?: string }) {
  await requirePermission(user, 'requests', 'view');
  return getRequests(user.organizationId, filters);
}

export async function getOrgRequest(user: AuthUser, requestId: string) {
  await requirePermission(user, 'requests', 'view');
  const request = await getRequestById(requestId);
  if (!request || request.organizationId !== user.organizationId) {
    throw new Error('Request not found');
  }
  return request;
}

export async function createRequestWithAudit(user: AuthUser, data: CreateRequestInput) {
  await requirePermission(user, 'requests', 'create');
  await requireActiveSubscription(user.organizationId);

  const userContext = getUserContext(user);
  const id = await dbCreateRequest({
    organizationId: user.organizationId,
    ...data,
    createdBy: userContext.uid,
    createdByName: userContext.displayName,
    createdByEmail: userContext.email,
    updatedBy: userContext.uid,
  });

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'REQUEST_SUBMITTED',
    module: 'requests',
    recordId: id,
    newValue: data,
  });

  return { id };
}

export async function approveRequestWithAudit(user: AuthUser, requestId: string) {
  await requirePermission(user, 'requests', 'update');

  const request = await getRequestById(requestId);
  if (!request || request.organizationId !== user.organizationId) {
    throw new Error('Request not found');
  }

  const userContext = getUserContext(user);
  await dbApproveRequest(requestId, userContext.uid);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'REQUEST_APPROVED',
    module: 'requests',
    recordId: requestId,
    oldValue: { status: request.status },
    newValue: { status: 'APPROVED' },
  });
}

export async function rejectRequestWithAudit(user: AuthUser, requestId: string) {
  await requirePermission(user, 'requests', 'update');

  const request = await getRequestById(requestId);
  if (!request || request.organizationId !== user.organizationId) {
    throw new Error('Request not found');
  }

  const userContext = getUserContext(user);
  await dbRejectRequest(requestId, userContext.uid);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'REQUEST_REJECTED',
    module: 'requests',
    recordId: requestId,
    oldValue: { status: request.status },
    newValue: { status: 'REJECTED' },
  });
}
