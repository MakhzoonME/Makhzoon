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

import type { PackageLimits, PackagePricing, FeatureKey, InclusionKey } from '@/types';

interface LimitsInput {
  maxAssets?: number;
  maxUsers?: number;
  maxWarranties?: number;
  maxRequests?: number;
  maxSpaces?: number;
  maxInventoryItems?: number;
}

export interface CreatePackageInput {
  name: string;
  description: string;
  pricing?: Partial<PackagePricing>;
  trialDays?: number;
  sortOrder?: number;
  limits?: LimitsInput;
  features?: Record<string, boolean>;
  inclusions?: Record<string, boolean>;
}

export interface UpdatePackageInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  pricing?: Partial<PackagePricing>;
  trialDays?: number;
  sortOrder?: number;
  limits?: LimitsInput;
  features?: Record<string, boolean>;
  inclusions?: Record<string, boolean>;
}

function normalizeLimits(limits?: LimitsInput): PackageLimits {
  return {
    maxAssets: limits?.maxAssets ?? -1,
    maxUsers: limits?.maxUsers ?? -1,
    maxWarranties: limits?.maxWarranties ?? -1,
    maxRequests: limits?.maxRequests ?? -1,
    maxSpaces: limits?.maxSpaces ?? -1,
    maxInventoryItems: limits?.maxInventoryItems ?? -1,
  };
}

function normalizePricing(pricing?: Partial<PackagePricing>): PackagePricing {
  return {
    monthlyPrice: pricing?.monthlyPrice ?? null,
    annualPrice: pricing?.annualPrice ?? null,
    currency: pricing?.currency ?? 'USD',
    isCustom: pricing?.isCustom ?? false,
  };
}

export async function getAllPackages() {
  return getPackages({ includeInactive: true });
}

export async function getPackageDetails(packageId: string) {
  return getPackageById(packageId);
}

export async function createPackageWithAudit(user: AuthUser, data: CreatePackageInput) {
  const userContext = getUserContext(user);
  const pkg = await dbCreatePackage(userContext.uid, {
    name: data.name,
    description: data.description,
    isActive: true,
    pricing: normalizePricing(data.pricing),
    trialDays: data.trialDays ?? 0,
    sortOrder: data.sortOrder ?? 0,
    limits: normalizeLimits(data.limits),
    features: (data.features ?? {}) as Record<FeatureKey, boolean>,
    inclusions: (data.inclusions ?? {}) as Record<InclusionKey, boolean>,
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
    ...(data.pricing && { pricing: normalizePricing(data.pricing) }),
    ...(data.limits && { limits: normalizeLimits(data.limits) }),
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
