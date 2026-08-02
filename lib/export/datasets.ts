import { Asset, Warranty } from '@/types';
import { formatDate } from '@/lib/utils/date';
import type { ExportColumn } from './xlsx';

/**
 * Shared column definitions + row builders for exportable datasets.
 * Reused by both CSV (lib/export/csv.ts) and XLSX (route handlers) so a
 * dataset's shape lives in exactly one place. Add new datasets here.
 */

export const ASSET_COLUMNS: ExportColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Name', key: 'name' },
  { header: 'Category', key: 'category' },
  { header: 'Status', key: 'status' },
  { header: 'Serial Number', key: 'serialNumber' },
  { header: 'Assigned To', key: 'assignedTo' },
  { header: 'Location', key: 'location' },
  { header: 'Purchase Date', key: 'purchaseDate' },
  { header: 'Purchase Cost', key: 'purchaseCost' },
  { header: 'Notes', key: 'notes' },
  { header: 'Created By', key: 'createdBy' },
  { header: 'Created At', key: 'createdAt' },
  { header: 'Updated By', key: 'updatedBy' },
  { header: 'Updated At', key: 'updatedAt' },
];

export function assetsToRows(assets: Asset[]): Record<string, unknown>[] {
  return assets.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    status: a.status,
    serialNumber: a.serialNumber ?? '',
    assignedTo: a.assignedTo ?? '',
    location: a.location ?? '',
    purchaseDate: a.purchaseDate ? formatDate(a.purchaseDate) : '',
    purchaseCost: a.purchaseCost ?? '',
    notes: a.notes ?? '',
    createdBy: a.createdBy,
    createdAt: formatDate(a.createdAt),
    updatedBy: a.updatedBy,
    updatedAt: formatDate(a.updatedAt),
  }));
}

export const WARRANTY_COLUMNS: ExportColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Asset ID', key: 'assetId' },
  { header: 'Asset Name', key: 'assetName' },
  { header: 'Vendor', key: 'vendor' },
  { header: 'Start Date', key: 'startDate' },
  { header: 'End Date', key: 'endDate' },
  { header: 'Reminder', key: 'reminder' },
  { header: 'Notes', key: 'notes' },
  { header: 'Created By', key: 'createdBy' },
  { header: 'Created At', key: 'createdAt' },
  { header: 'Updated By', key: 'updatedBy' },
  { header: 'Updated At', key: 'updatedAt' },
];

export function warrantiesToRows(
  warranties: (Warranty & { assetName?: string })[],
): Record<string, unknown>[] {
  return warranties.map((w) => ({
    id: w.id,
    assetId: w.assetId,
    assetName: w.assetName ?? '',
    vendor: w.vendor,
    startDate: formatDate(w.startDate),
    endDate: formatDate(w.endDate),
    reminder: w.reminder ? 'Yes' : 'No',
    notes: w.notes ?? '',
    createdBy: w.createdBy,
    createdAt: formatDate(w.createdAt),
    updatedBy: w.updatedBy,
    updatedAt: formatDate(w.updatedAt),
  }));
}

export const AUDIT_LOG_COLUMNS: ExportColumn[] = [
  { header: 'Timestamp', key: 'timestamp' },
  { header: 'Organization ID', key: 'organizationId' },
  { header: 'User ID', key: 'userId' },
  { header: 'Role', key: 'role' },
  { header: 'Action', key: 'action' },
  { header: 'Module', key: 'module' },
  { header: 'Record ID', key: 'recordId' },
  { header: 'Old Value', key: 'oldValue' },
  { header: 'New Value', key: 'newValue' },
];
