import { z } from 'zod'

export const warrantyConfigSchema = z.object({
  defaultDurationDays: z.number().int().min(1).max(3650).optional(),
  termsText:           z.string().max(3000).nullable().optional(),
  termsTextAr:         z.string().max(3000).nullable().optional(),
  headerText:          z.string().max(200).nullable().optional(),
  headerTextAr:        z.string().max(200).nullable().optional(),
  footerText:          z.string().max(500).nullable().optional(),
  footerTextAr:        z.string().max(500).nullable().optional(),
  showLogo:            z.boolean().optional(),
  showQr:              z.boolean().optional(),
  language:            z.enum(['en', 'ar', 'both']).optional(),
  template:            z.string().max(40).optional(),
  accentColor:         z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

const certItemSchema = z.object({
  inventoryItemId:   z.string().min(1),
  inventoryItemName: z.string().min(1).max(200),
  sku:               z.string().max(100).nullable().optional(),
  quantity:          z.number().positive(),
  unitPrice:         z.number().min(0),
})

export const createWarrantyCertSchema = z.object({
  sourceType:         z.enum(['order', 'pos_transaction']),
  orderId:            z.string().uuid().nullable().optional(),
  transactionId:      z.string().uuid().nullable().optional(),
  customerName:       z.string().trim().min(1).max(120),
  customerPhone:      z.string().trim().max(30).nullable().optional(),
  items:              z.array(certItemSchema).min(1, 'At least one item required'),
  warrantyStartDate:  z.string().date(),
  warrantyEndDate:    z.string().date(),
  notes:              z.string().trim().max(2000).nullable().optional(),
})

export type WarrantyConfigPatch       = z.infer<typeof warrantyConfigSchema>
export type CreateWarrantyCertPayload = z.infer<typeof createWarrantyCertSchema>
