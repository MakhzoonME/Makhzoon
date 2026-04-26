export type AuditStatus = 'draft' | 'in_progress' | 'completed';
export type AuditItemStatus = 'pending' | 'found' | 'missing';

export interface InventoryAudit {
  id: string;
  organizationId: string;
  title: string;
  status: AuditStatus;
  notes?: string;
  totalAssets: number;
  foundCount: number;
  missingCount: number;
  pendingCount: number;
  startedBy: string;
  startedByName?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAuditItem {
  id: string;
  auditId: string;
  organizationId: string;
  assetId: string;
  assetName: string;
  assetCategory: string;
  assetSerial?: string;
  assetLocation?: string;
  assetAssignedTo?: string;
  status: AuditItemStatus;
  note?: string;
  checkedAt?: Date;
  checkedBy?: string;
  checkedByName?: string;
}
