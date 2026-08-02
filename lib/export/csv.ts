import Papa from 'papaparse';
import { Asset, Warranty } from '@/types';
import { assetsToRows, warrantiesToRows } from './datasets';

export function exportAssetsToCSV(assets: Asset[]): string {
  return Papa.unparse(assetsToRows(assets));
}

export function exportWarrantiesToCSV(warranties: (Warranty & { assetName?: string })[]): string {
  return Papa.unparse(warrantiesToRows(warranties));
}
