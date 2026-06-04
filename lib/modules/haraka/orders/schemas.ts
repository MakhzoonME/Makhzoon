import { z } from 'zod'
import type { OrderStatus } from '@/types'

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new:              ['confirmed', 'cancelled'],
  confirmed:        ['assigned', 'cancelled'],
  assigned:         ['in_transit', 'ready_for_pickup', 'cancelled'],
  in_transit:       ['delivered', 'cancelled'],
  ready_for_pickup: ['picked_up', 'cancelled'],
  delivered:        [],
  picked_up:        [],
  cancelled:        [],
}

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

const orderLineSchema = z.object({
  inventoryItemId:   z.string().min(1),
  inventoryItemName: z.string().min(1).max(200),
  sku:               z.string().max(100).nullable().optional(),
  quantity:          z.number().positive(),
  unitPrice:         z.number().min(0),
  taxRate:           z.number().min(0).max(1).default(0),
  discountAmount:    z.number().min(0).default(0),
})

const deliveryAddressSchema = z.object({
  street: z.string().trim().max(200).nullable().optional(),
  area:   z.string().trim().max(100).nullable().optional(),
  city:   z.string().trim().max(100).nullable().optional(),
  notes:  z.string().trim().max(500).nullable().optional(),
})

export const createOrderSchema = z.object({
  channel:               z.string().min(1).max(60),
  fulfillmentType:       z.enum(['delivery', 'pickup']),
  customerName:          z.string().trim().min(1).max(120),
  customerPhone:         z.string().trim().max(30).nullable().optional(),
  customerId:            z.string().uuid().nullable().optional(),
  deliveryAddress:       deliveryAddressSchema.nullable().optional(),
  items:                 z.array(orderLineSchema).min(1, 'At least one item is required'),
  salesAgentId:          z.string().min(1),
  salesAgentName:        z.string().min(1).max(120),
  deliveryAgentId:       z.string().uuid().nullable().optional(),
  deliveryAgentMemberId: z.string().nullable().optional(),
  deliveryAgentName:     z.string().max(120).nullable().optional(),
  paymentMethod:         z.string().max(60).nullable().optional(),
  scheduledAt:           z.string().datetime().nullable().optional(),
  notes:                 z.string().trim().max(2000).nullable().optional(),
})

export const updateOrderSchema = z.object({
  notes:                 z.string().trim().max(2000).nullable().optional(),
  deliveryAddress:       deliveryAddressSchema.nullable().optional(),
  deliveryAgentId:       z.string().uuid().nullable().optional(),
  deliveryAgentMemberId: z.string().nullable().optional(),
  deliveryAgentName:     z.string().max(120).nullable().optional(),
  scheduledAt:           z.string().datetime().nullable().optional(),
  channel:               z.string().min(1).max(60).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'new', 'confirmed', 'assigned', 'in_transit',
    'ready_for_pickup', 'delivered', 'picked_up', 'cancelled',
  ]),
})

export const recordPaymentSchema = z.object({
  amountPaid:    z.number().min(0),
  paymentMethod: z.string().max(60).nullable().optional(),
})

export type CreateOrderPayload = z.infer<typeof createOrderSchema>
export type UpdateOrderPayload = z.infer<typeof updateOrderSchema>
export type UpdateOrderStatusPayload = z.infer<typeof updateOrderStatusSchema>
export type RecordPaymentPayload = z.infer<typeof recordPaymentSchema>
