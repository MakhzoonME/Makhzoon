import type { StockStatus } from '@/types/inventory.types';

/**
 * Single source of truth for deriving an inventory item's stock status from
 * its on-hand quantity vs. its reorder threshold. Previously duplicated in
 * inventory.repository, purchases.repository, and stock-audit.repository.
 *
 * Rules:
 *   qty === 0            → 'out'
 *   0 < qty < threshold  → 'low'
 *   qty >= threshold     → 'ok'   (a threshold of 0 means never "low")
 */
export function stockStatus(qty: number, threshold: number): StockStatus {
  if (qty === 0) return 'out';
  if (qty < threshold) return 'low';
  return 'ok';
}
