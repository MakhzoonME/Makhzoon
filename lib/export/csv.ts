import Papa from 'papaparse';
import { Asset, Warranty } from '@/types';
import { formatDate } from '@/lib/utils/date';

export function exportAssetsToCSV(assets: Asset[]): string {
  const rows = assets.map((a) => ({
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
  return Papa.unparse(rows);
}

export function exportWarrantiesToCSV(warranties: (Warranty & { assetName?: string })[]): string {
  const rows = warranties.map((w) => ({
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
  return Papa.unparse(rows);
}
