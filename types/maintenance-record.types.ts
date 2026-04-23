export type MaintenanceType = 'repair' | 'service' | 'inspection' | 'upgrade' | 'other';

export const MAINTENANCE_TYPES: MaintenanceType[] = ['repair', 'service', 'inspection', 'upgrade', 'other'];

export interface MaintenanceRecord {
  id: string;
  organizationId: string;
  assetId: string;
  type: MaintenanceType;
  description: string;
  performedBy?: string;
  cost?: number;
  date: Date;
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
}
