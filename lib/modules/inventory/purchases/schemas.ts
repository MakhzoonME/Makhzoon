import { z } from 'zod'
import { barcodeRegex } from '@/lib/validations/inventory.schema'
import { documentsSchema } from '@/lib/validations/document.schema'

export const purchaseLineSchema = z.object({
  /** Null while a barcode hasn't been resolved to an item yet. Server rejects unresolved lines on Receive. */
  itemId: z.string().min(1).nullable().optional(),
  itemName: z.string().trim().min(1, 'Item name is required'),
  sku: z.string().trim().optional().nullable(),
  barcode: z
    .string()
    .trim()
    .regex(barcodeRegex, 'Barcode must be 4–64 alphanumeric characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitCost: z.coerce.number().min(0, 'Unit cost cannot be negative'),
  taxRateId: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
})

export const createPurchaseSchema = z.object({
  supplierName: z.string().trim().min(1, 'Supplier name is required').max(120),
  supplierContact: z.string().trim().optional().nullable(),
  invoiceNumber: z.string().trim().optional().nullable(),
  invoiceDate: z.coerce.date(),
  notes: z.string().optional().nullable(),
  updateItemUnitCost: z.coerce.boolean().optional(),
  documents: documentsSchema,
  lines: z.array(purchaseLineSchema).min(1, 'At least one line item is required'),
})

export const updatePurchaseSchema = createPurchaseSchema.partial()

export type PurchaseLineFormData = z.infer<typeof purchaseLineSchema>
export type PurchaseFormData = z.infer<typeof createPurchaseSchema>
