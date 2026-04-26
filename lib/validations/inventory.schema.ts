import { z } from 'zod';

export const INVENTORY_UNITS = ['each', 'box', 'pack', 'pair', 'roll', 'liter', 'kg', 'meter', 'sheet', 'set'] as const;

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
