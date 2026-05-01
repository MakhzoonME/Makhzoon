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
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'warranties', 'view');
  return getWarranties(user.organizationId);
}

export async function getOrgWarranty(user: AuthUser, warrantyId: string) {
  if (!user.organizationId) throw new Error('User has no organization');
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
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'warranties', 'create');
  await requireActiveSubscription(user.organizationId, user);

  const userContext = getUserContext(user);
  const id = await dbCreateWarranty({
    organizationId: user.organizationId,
    ...data,
    reminder: data.reminder ?? false,
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
    newValue: data as unknown as Record<string, unknown>,
  });

  return { id };
}

export async function updateWarrantyWithAudit(
  user: AuthUser,
  warrantyId: string,
  data: UpdateWarrantyInput
) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'warranties', 'update');

  const warranty = await getWarrantyById(warrantyId);
  if (!warranty || warranty.organizationId !== user.organizationId) {
    throw new Error('Warranty not found');
  }

  const userContext = getUserContext(user);
  await dbUpdateWarranty(warrantyId, data as never);

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'WARRANTY_UPDATED',
    module: 'warranties',
    recordId: warrantyId,
    oldValue: warranty as unknown as Record<string, unknown>,
    newValue: data as unknown as Record<string, unknown>,
  });
}

export async function deleteWarrantyWithAudit(user: AuthUser, warrantyId: string) {
  if (!user.organizationId) throw new Error('User has no organization');
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
    oldValue: warranty as unknown as Record<string, unknown>,
  });
}
