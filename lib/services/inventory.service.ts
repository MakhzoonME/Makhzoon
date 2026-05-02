import { AuthUser } from '@/types/auth.types';
import {
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem as dbCreateInventoryItem,
  updateInventoryItem as dbUpdateInventoryItem,
  deleteInventoryItem as dbDeleteInventoryItem,
  getInventoryCategories,
  applyInventoryTransaction,
} from '@/lib/db/inventory';
import { queueAuditLog } from '@/lib/audit/logger';
import { requirePermission, requireActiveSubscription, getUserContext } from './base.service';

export interface CreateInventoryItemInput {
  name: string;
  category: string;
  sku?: string;
  unit: string;
  quantityOnHand: number;
  minimumThreshold: number;
  reorderQuantity?: number;
  location?: string;
  supplier?: string;
  unitCost?: number;
  notes?: string;
}

export interface UpdateInventoryItemInput {
  name?: string;
  category?: string;
  sku?: string;
  unit?: string;
  quantityOnHand?: number;
  minimumThreshold?: number;
  reorderQuantity?: number;
  location?: string;
  supplier?: string;
  unitCost?: number;
  notes?: string;
}

/**
 * Get all inventory items for organization with optional filters.
 */
export async function getOrgInventoryItems(
  user: AuthUser,
  filters?: {
    category?: string;
    stockStatus?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }
) {
  await requirePermission(user, 'inventory', 'view');
  return getInventoryItems(user.organizationId!, {
    ...filters,
    sortBy: filters?.sortBy as never,
  });
}

/**
 * Get single inventory item by ID.
 */
export async function getOrgInventoryItem(user: AuthUser, itemId: string) {
  await requirePermission(user, 'inventory', 'view');
  const item = await getInventoryItemById(itemId);
  if (!item || item.organizationId !== user.organizationId!) {
    throw new Error('Inventory item not found');
  }
  return item;
}

/**
 * Create inventory item with audit logging.
 */
export async function createInventoryItemWithAudit(
  user: AuthUser,
  data: CreateInventoryItemInput
) {
  await requirePermission(user, 'inventory', 'create');
  await requireActiveSubscription(user.organizationId!, user);

  const userContext = getUserContext(user);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = await dbCreateInventoryItem(
    {
      organizationId: user.organizationId!,
      ...data,
      createdBy: userContext.uid,
      createdByEmail: userContext.email,
      createdByName: userContext.displayName,
      updatedBy: userContext.uid,
      updatedByEmail: userContext.email,
      updatedByName: userContext.displayName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  );

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'INVENTORY_ITEM_CREATED',
    module: 'inventory',
    recordId: id,
    newValue: data as unknown as Record<string, unknown>,
  });

  return { id };
}

/**
 * Update inventory item with audit logging.
 */
export async function updateInventoryItemWithAudit(
  user: AuthUser,
  itemId: string,
  data: UpdateInventoryItemInput
) {
  await requirePermission(user, 'inventory', 'update');
  await requireActiveSubscription(user.organizationId!, user);

  // Verify item belongs to user's org
  const item = await getInventoryItemById(itemId);
  if (!item || item.organizationId !== user.organizationId!) {
    throw new Error('Inventory item not found');
  }

  const userContext = getUserContext(user);
  const updateData = {
    ...data,
    updatedBy: userContext.uid,
    updatedByEmail: userContext.email,
    updatedByName: userContext.displayName,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await dbUpdateInventoryItem(itemId, updateData as unknown as Partial<any>);

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'INVENTORY_ITEM_UPDATED',
    module: 'inventory',
    recordId: itemId,
    oldValue: item as unknown as Record<string, unknown>,
    newValue: data as unknown as Record<string, unknown>,
  });
}

/**
 * Delete inventory item with audit logging.
 */
export async function deleteInventoryItemWithAudit(user: AuthUser, itemId: string) {
  await requirePermission(user, 'inventory', 'delete');
  await requireActiveSubscription(user.organizationId!, user);

  // Verify item belongs to user's org
  const item = await getInventoryItemById(itemId);
  if (!item || item.organizationId !== user.organizationId!) {
    throw new Error('Inventory item not found');
  }

  const userContext = getUserContext(user);
  await dbDeleteInventoryItem(itemId);

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'INVENTORY_ITEM_DELETED',
    module: 'inventory',
    recordId: itemId,
    oldValue: item as unknown as Record<string, unknown>,
  });
}

/**
 * Get inventory categories for organization.
 */
export async function getOrgInventoryCategories(user: AuthUser) {
  await requirePermission(user, 'inventory', 'view');
  return getInventoryCategories(user.organizationId!);
}

/**
 * Apply inventory transaction (in/out/adjustment) with audit logging.
 */
export async function applyInventoryTransactionWithAudit(
  user: AuthUser,
  itemId: string,
  type: 'in' | 'out' | 'adjustment',
  quantity: number,
  reason: string,
  note?: string
) {
  await requirePermission(user, 'inventory', 'update');
  await requireActiveSubscription(user.organizationId!, user);

  // Verify item belongs to user's org
  const item = await getInventoryItemById(itemId);
  if (!item || item.organizationId !== user.organizationId!) {
    throw new Error('Inventory item not found');
  }

  const userContext = getUserContext(user);
  const result = await applyInventoryTransaction(
    itemId,
    type,
    quantity,
    {
      uid: userContext.uid,
      email: userContext.email,
      displayName: userContext.displayName,
      role: userContext.role,
    },
    reason,
    note
  );

  queueAuditLog({
    organizationId: user.organizationId!,
    userId: userContext.uid,
    role: userContext.role,
    action: 'INVENTORY_TRANSACTION_CREATED',
    module: 'inventory',
    recordId: itemId,
    newValue: {
      type,
      quantity,
      reason,
      note,
      quantityBefore: item.quantityOnHand,
      quantityAfter: result.quantityAfter,
    },
  });

  return result;
}
