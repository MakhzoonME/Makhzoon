import Papa from 'papaparse';
import { Asset, Warranty, PosCustomer } from '@/types';
import { assetsToRows, warrantiesToRows, customersToRows, type CustomerCustomFieldsData } from './datasets';

export function exportAssetsToCSV(assets: Asset[]): string {
  return Papa.unparse(assetsToRows(assets));
}

export function exportWarrantiesToCSV(warranties: (Warranty & { assetName?: string })[]): string {
  return Papa.unparse(warrantiesToRows(warranties));
}

export function exportCustomersToCSV(customers: PosCustomer[], customFields?: CustomerCustomFieldsData): string {
  return Papa.unparse(customersToRows(customers, customFields));
}
