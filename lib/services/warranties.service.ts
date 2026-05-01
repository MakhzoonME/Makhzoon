import { AuthUser } from '@/types/auth.types';
import {
  getWarranties,
  getWarrantyById,
  createWarranty as dbCreateWarranty,
  updateWarranty as dbUpdateWarranty,
  deleteWarranty as dbDeleteWarranty,
} from '@/lib/db/warranties';
import { queueAuditLog } from '@/lib/audit/logger';
import { requirePermission, requireActiveSubscription, getUserContext } from './base.service';

export interface CreateWarrantyInput {
  assetId: string;
  vendor: string;
  startDate: Date;
  endDate: Date;
  reminder?: boolean;
  notes?: string;
}

export interface UpdateWarrantyInput {
  vendor?: string;
  startDate?: Date;
  endDate?: Date;
  reminder?: boolean;
  notes?: string;
}

export async function getOrgWarranties(user: AuthUser) {
  await requirePermission(user, 'warranties', 'view');
  return getWarranties(user.organizationId);
}

export async function getOrgWarranty(user: AuthUser, warrantyId: string) {
  await requirePermission(user, 'warranties', 'view');
  const warranty = await getWarrantyById(warrantyId);
  if (!warranty || warranty.organizationId !== user.organizationId) {
    throw new Error('Warranty not found');
  }
  return warranty;
}

export async function createWarrantyWithAudit(
  user: AuthUser,
  data: CreateWarrantyInput
) {
  await requirePermission(user, 'warranties', 'create');
  await requireActiveSubscription(user.organizationId);

  const userContext = getUserContext(user);
  const id = await dbCreateWarranty({
    organizationId: user.organizationId,
    ...data,
    createdBy: userContext.uid,
    updatedBy: userContext.uid,
  });

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'WARRANTY_CREATED',
    module: 'warranties',
    recordId: id,
    newValue: data,
  });

  return { id };
}

export async function updateWarrantyWithAudit(
  user: AuthUser,
  warrantyId: string,
  data: UpdateWarrantyInput
) {
  await requirePermission(user, 'warranties', 'update');

  const warranty = await getWarrantyById(warrantyId);
  if (!warranty || warranty.organizationId !== user.organizationId) {
    throw new Error('Warranty not found');
  }

  const userContext = getUserContext(user);
  await dbUpdateWarranty(warrantyId, data);

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'WARRANTY_UPDATED',
    module: 'warranties',
    recordId: warrantyId,
    oldValue: warranty,
    newValue: data,
  });
}

export async function deleteWarrantyWithAudit(user: AuthUser, warrantyId: string) {
  await requirePermission(user, 'warranties', 'delete');

  const warranty = await getWarrantyById(warrantyId);
  if (!warranty || warranty.organizationId !== user.organizationId) {
    throw new Error('Warranty not found');
  }

  const userContext = getUserContext(user);
  await dbDeleteWarranty(warrantyId);

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'WARRANTY_DELETED',
    module: 'warranties',
    recordId: warrantyId,
    oldValue: warranty,
  });
}
