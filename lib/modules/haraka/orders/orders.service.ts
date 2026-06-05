import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { notificationQueue } from '@/lib/notifications/notification-queue'
import type { OrderStatus } from '@/types'
import { isValidTransition } from './schemas'
import { OrdersRepository, type CreateOrderInput, type ListOrdersOpts } from './orders.repository'

const repo = new OrdersRepository()

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'view_orders')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireManage(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'manage_orders')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireAssign(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'assign_delivery')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class OrdersService {
  async list(tenant: TenantContext, opts?: ListOrdersOpts) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const order = await repo.getById(tenant, id)
    if (!order) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return order
  }

  async create(tenant: TenantContext, input: CreateOrderInput) {
    requireManage(tenant)
    const order = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'ORDER_CREATED',
      recordId: order.id,
      newValue: { orderNumber: order.orderNumber, channel: order.channel, total: order.total },
    })
    notificationQueue.enqueue({
      tenant,
      eventType: 'order.created',
      data: { orderNumber: order.orderNumber, channel: order.channel, customerName: order.customerName },
      link: `/haraka/orders/${order.id}`,
      titleOverride: `New order ${order.orderNumber} received`,
    })
    return order
  }

  async update(tenant: TenantContext, id: string, patch: Parameters<typeof repo.update>[2]) {
    const hasDeliveryChange =
      'deliveryAgentId' in patch ||
      'deliveryAgentMemberId' in patch ||
      'deliveryAgentName' in patch
    if (hasDeliveryChange) {
      requireAssign(tenant)
    } else {
      requireManage(tenant)
    }
    await this.getById(tenant, id)
    const order = await repo.update(tenant, id, patch)
    auditLog.queue({ tenant, module: 'pos', action: 'ORDER_UPDATED', recordId: id, newValue: patch })
    return order
  }

  async updateStatus(tenant: TenantContext, id: string, newStatus: OrderStatus) {
    requireManage(tenant)
    const order = await this.getById(tenant, id)
    if (!isValidTransition(order.status, newStatus)) {
      throw NextResponse.json(
        { error: `Cannot transition from '${order.status}' to '${newStatus}'` },
        { status: 400 },
      )
    }
    const updated = await repo.updateStatus(tenant, id, newStatus)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'ORDER_STATUS_CHANGED',
      recordId: id,
      newValue: { from: order.status, to: newStatus },
    })
    notificationQueue.enqueue({
      tenant,
      eventType: 'order.status_changed',
      data: { orderNumber: order.orderNumber, status: newStatus },
      link: `/haraka/orders/${id}`,
      titleOverride: `Order ${order.orderNumber} is now ${newStatus.replace('_', ' ')}`,
    })
    return updated
  }

  async recordPayment(
    tenant: TenantContext,
    id: string,
    amountPaid: number,
    paymentMethod: string | null,
  ) {
    requireManage(tenant)
    await this.getById(tenant, id)
    const order = await repo.recordPayment(tenant, id, amountPaid, paymentMethod)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'ORDER_PAYMENT_RECORDED',
      recordId: id,
      newValue: { amountPaid, paymentMethod, paymentStatus: order.paymentStatus },
    })
    return order
  }
}
