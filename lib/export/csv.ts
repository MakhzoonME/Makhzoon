import Papa from 'papaparse';
import { Asset, Warranty, PosCustomer } from '@/types';
import { assetsToRows, warrantiesToRows, customersToRows } from './datasets';

export function exportAssetsToCSV(assets: Asset[]): string {
  return Papa.unparse(assetsToRows(assets));
}

export function exportWarrantiesToCSV(warranties: (Warranty & { assetName?: string })[]): string {
  return Papa.unparse(warrantiesToRows(warranties));
}

export function exportCustomersToCSV(customers: PosCustomer[]): string {
  return Papa.unparse(customersToRows(customers));
}
