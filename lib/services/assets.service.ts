import { AuthUser } from '@/types/auth.types';
import {
  getAssets,
  getAssetById,
  createAsset as dbCreateAsset,
  updateAsset as dbUpdateAsset,
  deleteAsset as dbDeleteAsset,
  getAssetCategories,
} from '@/lib/db/assets';
import {
  getCheckouts,
  getActiveCheckoutForAsset,
  createCheckout as dbCreateCheckout,
  markReturned as dbMarkReturned,
} from '@/lib/db/asset-checkouts';
import {
  getMaintenanceRecords as dbGetMaintenanceRecords,
  createMaintenanceRecord as dbCreateMaintenance,
} from '@/lib/db/maintenance-records';
import {
  getAssetNotes as dbGetAssetNotes,
  createAssetNote as dbCreateAssetNote,
  deleteAssetNote as dbDeleteAssetNote,
} from '@/lib/db/asset-notes';
import { queueAuditLog } from '@/lib/audit/logger';
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
  documents?: import('@/types').DocumentRef[];
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
  documents?: import('@/types').DocumentRef[];
}

/**
 * Get all assets for organization with optional filters.
 */
export async function getOrgAssets(
  user: AuthUser,
  filters?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }
) {
  await requirePermission(user, 'assets', 'view');
  return getAssets(user.organizationId!, {
    ...filters,
    sortBy: filters?.sortBy as never,
  });
}

/**
 * Get single asset by ID.
 */
export async function getOrgAsset(user: AuthUser, assetId: string) {
  await requirePermission(user, 'assets', 'view');
  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
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
  await requireActiveSubscription(user.organizationId!, user);

  const userContext = getUserContext(user);
  const id = await dbCreateAsset(
    {
      organizationId: user.organizationId!,
      ...data,
      createdBy: userContext.uid,
      createdByEmail: userContext.email,
      createdByName: userContext.displayName,
      createdByRole: userContext.role,
      updatedBy: userContext.uid,
      updatedByEmail: userContext.email,
      updatedByName: userContext.displayName,
      updatedByRole: userContext.role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  );

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ASSET_CREATED',
    module: 'assets',
    recordId: id,
    newValue: data as unknown as Record<string, unknown>,
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
  await requireActiveSubscription(user.organizationId!, user);

  // Verify asset belongs to user's org
  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await dbUpdateAsset(assetId, updateData as unknown as Partial<any>);

  // Detect if this is a retirement (status change to 'Retired')
  const isRetirement = data.status === 'Retired' && asset.status !== 'Retired';
  const action = isRetirement ? 'ASSET_RETIRED' : 'ASSET_UPDATED';

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action,
    module: 'assets',
    recordId: assetId,
    oldValue: { status: asset.status, name: asset.name },
    newValue: { status: data.status, name: data.name },
  });
}

/**
 * Delete asset with audit logging.
 * If asset is retired, hard-delete it. Otherwise, retire it.
 */
export async function deleteAssetWithAudit(user: AuthUser, assetId: string) {
  await requirePermission(user, 'assets', 'delete');
  await requireActiveSubscription(user.organizationId!, user);

  // Verify asset belongs to user's org
  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
    throw new Error('Asset not found');
  }

  const userContext = getUserContext(user);

  if (asset.status === 'Retired') {
    // Hard-delete already-retired assets
    await dbDeleteAsset(assetId);
    queueAuditLog({
      organizationId: asset.organizationId,
      userId: userContext.uid,
      role: userContext.role,
      action: 'ASSET_DELETED',
      module: 'assets',
      recordId: assetId,
      oldValue: { status: asset.status, name: asset.name },
      newValue: undefined,
    });
  } else {
    // Retire active assets
    await dbUpdateAsset(assetId, {
      status: 'Retired',
      updatedBy: userContext.uid,
      updatedByEmail: userContext.email,
      updatedByName: userContext.displayName,
      updatedByRole: userContext.role,
    });
    queueAuditLog({
      organizationId: asset.organizationId,
      userId: userContext.uid,
      role: userContext.role,
      action: 'ASSET_RETIRED',
      module: 'assets',
      recordId: assetId,
      oldValue: { status: asset.status },
      newValue: { status: 'Retired' },
    });
  }
}

/**
 * Get asset categories for organization.
 */
export async function getOrgAssetCategories(user: AuthUser) {
  await requirePermission(user, 'assets', 'view');
  return getAssetCategories(user.organizationId!);
}

/**
 * Get checkouts for an asset.
 */
export async function getAssetCheckouts(user: AuthUser, assetId: string) {
  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
    throw new Error('Asset not found');
  }
  return getCheckouts(user.organizationId!, { assetId });
}

/**
 * Create asset checkout with audit logging.
 */
export async function createAssetCheckout(
  user: AuthUser,
  assetId: string,
  data: { checkedOutTo: string; dueDate?: string; notes?: string },
  spaceId?: string,
) {
  await requirePermission(user, 'assets', 'update');
  await requireActiveSubscription(user.organizationId!, user);

  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
    throw new Error('Asset not found');
  }
  if (asset.status !== 'Active') {
    throw new Error('Retired assets cannot be checked out');
  }

  const existing = await getActiveCheckoutForAsset(user.organizationId!, assetId);
  if (existing) {
    throw new Error('Asset is already checked out. Return it first.');
  }

  const userContext = getUserContext(user);
  const id = await dbCreateCheckout({
    organizationId: user.organizationId!,
    spaceId,
    assetId,
    checkedOutTo: data.checkedOutTo.trim(),
    checkedOutBy: userContext.uid,
    checkedOutByEmail: userContext.email!,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    notes: data.notes?.trim() || undefined,
  });

  await dbUpdateAsset(assetId, {
    assignedTo: data.checkedOutTo.trim(),
    updatedBy: userContext.uid,
    updatedByEmail: userContext.email,
    updatedByName: userContext.displayName,
    updatedByRole: userContext.role,
  });

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ASSET_CHECKED_OUT',
    module: 'assets',
    recordId: assetId,
    newValue: { checkoutId: id, checkedOutTo: data.checkedOutTo, dueDate: data.dueDate },
  });

  return { id };
}

/**
 * Return asset checkout with audit logging.
 */
export async function returnAssetCheckout(
  user: AuthUser,
  assetId: string,
  checkoutId: string
) {
  await requirePermission(user, 'assets', 'update');
  await requireActiveSubscription(user.organizationId!, user);

  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
    throw new Error('Asset not found');
  }

  const userContext = getUserContext(user);
  await dbMarkReturned(checkoutId, {
    returnedBy: userContext.uid,
    returnedByEmail: userContext.email!,
  });
  await dbUpdateAsset(assetId, {
    assignedTo: undefined,
    updatedBy: userContext.uid,
    updatedByEmail: userContext.email,
    updatedByName: userContext.displayName,
    updatedByRole: userContext.role,
  });

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ASSET_CHECKED_IN',
    module: 'assets',
    recordId: assetId,
    newValue: { checkoutId },
  });
}

/**
 * Get maintenance records for an asset.
 */
export async function getAssetMaintenance(user: AuthUser, assetId: string) {
  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
    throw new Error('Asset not found');
  }
  return dbGetMaintenanceRecords(user.organizationId!, assetId);
}

/**
 * Create maintenance record with audit logging.
 */
export async function createAssetMaintenance(
  user: AuthUser,
  assetId: string,
  data: { type: string; description: string; cost?: number; performedBy?: string; date?: string },
  spaceId?: string,
) {
  await requirePermission(user, 'assets', 'update');
  await requireActiveSubscription(user.organizationId!, user);

  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
    throw new Error('Asset not found');
  }

  const userContext = getUserContext(user);
   
  const id = await dbCreateMaintenance(
    {
      organizationId: user.organizationId!,
      spaceId,
      assetId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: data.type as any,
      description: data.description,
      cost: data.cost ? Number(data.cost) : undefined,
      performedBy: data.performedBy || userContext.displayName,
      date: data.date ? new Date(data.date) : new Date(),
      recordedBy: userContext.uid,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  );

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'MAINTENANCE_ADDED',
    module: 'assets',
    recordId: assetId,
    newValue: { maintenanceId: id, ...data },
  });

  return { id };
}

/**
 * Get notes for an asset.
 */
export async function getAssetNotesForAsset(user: AuthUser, assetId: string) {
  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
    throw new Error('Asset not found');
  }
  return dbGetAssetNotes(user.organizationId!, assetId);
}

/**
 * Create asset note with audit logging.
 */
export async function createAssetNoteWithAudit(
  user: AuthUser,
  assetId: string,
  data: { note: string }
) {
  await requirePermission(user, 'assets', 'update');
  await requireActiveSubscription(user.organizationId!, user);

  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
    throw new Error('Asset not found');
  }

  const userContext = getUserContext(user);
   
  const id = await dbCreateAssetNote({
    organizationId: user.organizationId!,
    assetId,
    note: data.note.trim(),
    createdBy: userContext.uid,
    createdByEmail: userContext.email!,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ASSET_NOTE_ADDED',
    module: 'assets',
    recordId: assetId,
    newValue: { noteId: id, note: data.note },
  });

  return { id };
}

/**
 * Delete asset note with audit logging.
 */
export async function deleteAssetNoteWithAudit(user: AuthUser, assetId: string, noteId: string) {
  await requirePermission(user, 'assets', 'update');
  await requireActiveSubscription(user.organizationId!, user);

  const asset = await getAssetById(assetId);
  if (!asset || asset.organizationId !== user.organizationId!) {
    throw new Error('Asset not found');
  }

  const userContext = getUserContext(user);
  await dbDeleteAssetNote(noteId);

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ASSET_NOTE_DELETED',
    module: 'assets',
    recordId: assetId,
    newValue: { noteId },
  });
}
