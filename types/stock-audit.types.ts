export type StockAuditStatus = 'draft' | 'in_progress' | 'completed';
export type StockAuditItemStatus = 'pending' | 'counted';

export interface StockAudit {
  id: string;
  organizationId: string;
  title: string;
  notes?: string;
  status: StockAuditStatus;
  totalItems: number;
  countedCount: number;
  pendingCount: number;
  varianceTotal: number;
  startedBy?: string;
  startedByName?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockAuditItem {
  id: string;
  auditId: string;
  organizationId: string;
  inventoryItemId?: string;
  itemName: string;
  itemSku?: string;
  itemUnit?: string;
  itemCategory?: string;
  itemLocation?: string;
  expectedQuantity: number;
  countedQuantity?: number;
  note?: string;
  status: StockAuditItemStatus;
  checkedAt?: Date;
  checkedBy?: string;
  checkedByName?: string;
}

/** Adjustment decision per audit item, used on complete. A number = override. */
export type StockAuditAdjustment = 'apply' | 'skip' | number;
