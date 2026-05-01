import { AuthUser } from '@/types/auth.types';
import {
  getPackages,
  getPackageById,
  createPackage as dbCreatePackage,
  updatePackage as dbUpdatePackage,
  deletePackage as dbDeletePackage,
} from '@/lib/db/packages';
import { writeAuditLog } from '@/lib/audit/logger';
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
  const id = await dbCreatePackage({
    ...data,
    isActive: true,
    createdBy: userContext.uid,
    updatedBy: userContext.uid,
  });

  await writeAuditLog({
    organizationId: 'system',
    userId: userContext.uid,
    role: userContext.role,
    action: 'PACKAGE_CREATED',
    module: 'packages',
    recordId: id,
    newValue: data,
  });

  return { id };
}

export async function updatePackageWithAudit(
  user: AuthUser,
  packageId: string,
  data: UpdatePackageInput
) {
  const pkg = await getPackageById(packageId);
  if (!pkg) throw new Error('Package not found');

  const userContext = getUserContext(user);
  await dbUpdatePackage(packageId, data);

  await writeAuditLog({
    organizationId: 'system',
    userId: userContext.uid,
    role: userContext.role,
    action: 'PACKAGE_UPDATED',
    module: 'packages',
    recordId: packageId,
    oldValue: pkg,
    newValue: data,
  });
}

export async function deletePackageWithAudit(user: AuthUser, packageId: string) {
  const pkg = await getPackageById(packageId);
  if (!pkg) throw new Error('Package not found');

  const userContext = getUserContext(user);
  await dbDeletePackage(packageId);

  await writeAuditLog({
    organizationId: 'system',
    userId: userContext.uid,
    role: userContext.role,
    action: 'PACKAGE_DELETED',
    module: 'packages',
    recordId: packageId,
    oldValue: pkg,
  });
}
