import { Asset, Warranty, PosCustomer } from '@/types';
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

export const CUSTOMER_COLUMNS: ExportColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Name', key: 'name' },
  { header: 'Phone', key: 'phone' },
  { header: 'Email', key: 'email' },
  { header: 'Tax Number', key: 'taxNumber' },
  { header: 'Notes', key: 'notes' },
  { header: 'Created At', key: 'createdAt' },
  { header: 'Updated At', key: 'updatedAt' },
];

export interface CustomerCustomFieldsData {
  fields: { id: string; label: string }[];
  valuesByRecordId: Map<string, Map<string, unknown>>;
}

export function customersToRows(
  customers: PosCustomer[],
  customFields?: CustomerCustomFieldsData,
): Record<string, unknown>[] {
  return customers.map((c) => {
    const row: Record<string, unknown> = {
      id: c.id,
      name: c.name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      taxNumber: c.taxNumber ?? '',
      notes: c.notes ?? '',
      createdAt: formatDate(c.createdAt),
      updatedAt: formatDate(c.updatedAt),
    };
    if (customFields) {
      const values = customFields.valuesByRecordId.get(c.id);
      for (const field of customFields.fields) {
        const value = values?.get(field.id);
        row[field.label] = value === null || value === undefined
          ? ''
          : typeof value === 'object' ? JSON.stringify(value) : value;
      }
    }
    return row;
  });
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
