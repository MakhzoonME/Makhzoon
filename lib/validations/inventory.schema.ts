import { z } from 'zod';

export const INVENTORY_UNITS = ['each', 'box', 'pack', 'pair', 'roll', 'liter', 'kg', 'meter', 'sheet', 'set'] as const;

/**
 * Barcode format rule: 4–64 alphanumeric chars. Covers EAN-8/13, UPC, Code128, etc.
 * We don't validate symbology-specifically — uniqueness is enforced server-side per organization.
 */
export const barcodeRegex = /^[A-Za-z0-9]{4,64}$/;

export const inventoryItemSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(1, 'Category is required'),
  sku: z.string().optional(),
  unit: z.enum(INVENTORY_UNITS),
  quantityOnHand: z.coerce.number().min(0, 'Quantity cannot be negative'),
  minimumThreshold: z.coerce.number().min(0, 'Threshold cannot be negative'),
  reorderQuantity: z.coerce.number().min(0).optional().or(z.literal('')),
  location: z.string().optional(),
  supplier: z.string().optional(),
  unitCost: z.coerce.number().min(0).optional().or(z.literal('')),
  notes: z.string().optional(),
  barcode: z
    .string()
    .trim()
    .regex(barcodeRegex, 'Barcode must be 4–64 alphanumeric characters')
    .optional()
    .or(z.literal('')),
  posEnabled: z.coerce.boolean().optional(),
  posPrice: z.coerce.number().min(0).optional().or(z.literal('')),
  taxRateId: z.string().optional().or(z.literal('')),
});

export const inventoryTransactionSchema = z.object({
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  note: z.string().optional(),
});

export const inventoryAuditSchema = z.object({
  title: z.string().min(2).max(100),
  notes: z.string().optional(),
});

export type InventoryItemFormData = z.infer<typeof inventoryItemSchema>;
export type InventoryTransactionFormData = z.infer<typeof inventoryTransactionSchema>;
export type InventoryAuditFormData = z.infer<typeof inventoryAuditSchema>;
