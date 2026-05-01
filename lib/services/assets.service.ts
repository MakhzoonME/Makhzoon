import { AuthUser } from '@/types/auth.types';
import {
  getAssets,
  getAssetById,
  createAsset as dbCreateAsset,
  updateAsset as dbUpdateAsset,
  deleteAsset as dbDeleteAsset,
  getAssetCategories,
} from '@/lib/db/assets';
import { writeAuditLog } from '@/lib/audit/logger';
import { requirePermission, requireActiveSubscription, getUserContext } from './base.service';

export interface CreateAssetInput {
  name: string;
  category: string;
  status: string;
  serialNumber?: string;
  purchaseDate?: Date;
  purchaseCost?: number;
  assignedTo?: string;
  location?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  name?: string;
  category?: string;
  status?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  purchaseCost?: number;
  assignedTo?: string;
  location?: string;
  notes?: string;
}

/**
 * Get all assets for organization with optional filters.
 */
export async function getOrgAssets(
  user: AuthUser,
  filters?: { status?: string; category?: string; search?: string; cursor?: string }
) {
  await requirePermission(user, 'assets', 'view');
  return getAssets(user.organizationId, filters);
}

/**
 * Get single asset by ID.
 */
export async function getOrgAsset(user: AuthUser, assetId: string) {
  await requirePermission(user, 'assets', 'view');
  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId) {
    throw new Error('Asset not found');
  }
  return asset;
}

/**
 * Create asset with audit logging.
 */
export async function createAssetWithAudit(
  user: AuthUser,
  data: CreateAssetInput
) {
  await requirePermission(user, 'assets', 'create');
  await requireActiveSubscription(user.organizationId);

  const userContext = getUserContext(user);
  const id = await dbCreateAsset({
    organizationId: user.organizationId,
    ...data,
    createdBy: userContext.uid,
    createdByEmail: userContext.email,
    createdByName: userContext.displayName,
    createdByRole: userContext.role,
    updatedBy: userContext.uid,
    updatedByEmail: userContext.email,
    updatedByName: userContext.displayName,
    updatedByRole: userContext.role,
  });

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ASSET_CREATED',
    module: 'assets',
    recordId: id,
    newValue: data,
  });

  return { id };
}

/**
 * Update asset with audit logging.
 */
export async function updateAssetWithAudit(
  user: AuthUser,
  assetId: string,
  data: UpdateAssetInput
) {
  await requirePermission(user, 'assets', 'update');

  // Verify asset belongs to user's org
  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId) {
    throw new Error('Asset not found');
  }

  const userContext = getUserContext(user);
  const updateData = {
    ...data,
    updatedBy: userContext.uid,
    updatedByEmail: userContext.email,
    updatedByName: userContext.displayName,
    updatedByRole: userContext.role,
  };

  await dbUpdateAsset(assetId, updateData);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ASSET_UPDATED',
    module: 'assets',
    recordId: assetId,
    oldValue: asset,
    newValue: data,
  });
}

/**
 * Delete asset with audit logging.
 */
export async function deleteAssetWithAudit(user: AuthUser, assetId: string) {
  await requirePermission(user, 'assets', 'delete');

  // Verify asset belongs to user's org
  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId) {
    throw new Error('Asset not found');
  }

  const userContext = getUserContext(user);
  await dbDeleteAsset(assetId);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ASSET_DELETED',
    module: 'assets',
    recordId: assetId,
    oldValue: asset,
  });
}

/**
 * Get asset categories for organization.
 */
export async function getOrgAssetCategories(user: AuthUser) {
  await requirePermission(user, 'assets', 'view');
  return getAssetCategories(user.organizationId);
}
