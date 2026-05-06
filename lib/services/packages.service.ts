import { AuthUser } from '@/types/auth.types';
import {
  getPackages,
  getPackageById,
  createPackage as dbCreatePackage,
  updatePackage as dbUpdatePackage,
  deletePackage as dbDeletePackage,
} from '@/lib/db/packages';
import { queueAuditLog } from '@/lib/audit/logger';
import { getUserContext } from './base.service';

export interface CreatePackageInput {
  name: string;
  description: string;
  limits?: { maxAssets?: number; maxUsers?: number; maxWarranties?: number; maxRequests?: number };
  features?: Record<string, boolean>;
}

export interface UpdatePackageInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  limits?: { maxAssets?: number; maxUsers?: number; maxWarranties?: number; maxRequests?: number };
  features?: Record<string, boolean>;
}

export async function getAllPackages() {
  return getPackages({ includeInactive: true });
}

export async function getPackageDetails(packageId: string) {
  return getPackageById(packageId);
}

export async function createPackageWithAudit(user: AuthUser, data: CreatePackageInput) {
  const userContext = getUserContext(user);
  const limits = data.limits ?? { maxAssets: -1, maxUsers: -1, maxWarranties: -1, maxRequests: -1 };
  const pkg = await dbCreatePackage(userContext.uid, {
    name: data.name,
    description: data.description,
    isActive: true,
    limits: {
      maxAssets: limits.maxAssets ?? -1,
      maxUsers: limits.maxUsers ?? -1,
      maxWarranties: limits.maxWarranties ?? -1,
      maxRequests: limits.maxRequests ?? -1,
    },
    features: data.features ?? {},
  });

  queueAuditLog({
    organizationId: 'system',
    userId: userContext.uid,
    role: userContext.role,
    action: 'PACKAGE_CREATED',
    module: 'packages',
    recordId: pkg.id,
    newValue: data as unknown as Record<string, unknown>,
  });

  return { id: pkg.id };
}

export async function updatePackageWithAudit(
  user: AuthUser,
  packageId: string,
  data: UpdatePackageInput
) {
  const pkg = await getPackageById(packageId);
  if (!pkg) throw new Error('Package not found');

  const userContext = getUserContext(user);
  const updates = {
    ...data,
    ...(data.limits && {
      limits: {
        maxAssets: data.limits.maxAssets ?? -1,
        maxUsers: data.limits.maxUsers ?? -1,
        maxWarranties: data.limits.maxWarranties ?? -1,
        maxRequests: data.limits.maxRequests ?? -1,
      },
    }),
  };
  await dbUpdatePackage(packageId, userContext.uid, updates as never);

  queueAuditLog({
    organizationId: 'system',
    userId: userContext.uid,
    role: userContext.role,
    action: 'PACKAGE_UPDATED',
    module: 'packages',
    recordId: packageId,
    oldValue: pkg as unknown as Record<string, unknown>,
    newValue: data as unknown as Record<string, unknown>,
  });
}

export async function deletePackageWithAudit(user: AuthUser, packageId: string) {
  const pkg = await getPackageById(packageId);
  if (!pkg) throw new Error('Package not found');

  const userContext = getUserContext(user);
  await dbDeletePackage(packageId, userContext.uid);

  queueAuditLog({
    organizationId: 'system',
    userId: userContext.uid,
    role: userContext.role,
    action: 'PACKAGE_DELETED',
    module: 'packages',
    recordId: packageId,
    oldValue: pkg as unknown as Record<string, unknown>,
  });
}
