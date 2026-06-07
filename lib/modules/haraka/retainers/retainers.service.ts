import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import type { RetainerStatus } from '@/types'
import { isValidRetainerTransition } from './schemas'
import {
  RetainersRepository,
  type CreateRetainerInput,
  type ListRetainersOpts,
  type CreateRetainerInvoiceInput,
} from './retainers.repository'
import type { UpdateRetainerInvoicePayload } from './schemas'

const repo = new RetainersRepository()

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'view_retainers')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireManage(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'manage_retainers')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class RetainersService {
  async list(tenant: TenantContext, opts?: ListRetainersOpts) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const retainer = await repo.getById(tenant, id)
    if (!retainer) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return retainer
  }

  async create(tenant: TenantContext, input: CreateRetainerInput) {
    requireManage(tenant)
    const retainer = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'RETAINER_CREATED',
      recordId: retainer.id,
      newValue: { retainerNumber: retainer.retainerNumber, name: retainer.name },
    })
    return retainer
  }

  async update(tenant: TenantContext, id: string, patch: Parameters<typeof repo.update>[2]) {
    requireManage(tenant)
    await this.getById(tenant, id)
    const retainer = await repo.update(tenant, id, patch)
    auditLog.queue({ tenant, module: 'pos', action: 'RETAINER_UPDATED', recordId: id, newValue: patch })
    return retainer
  }

  async updateStatus(tenant: TenantContext, id: string, status: RetainerStatus) {
    requireManage(tenant)
    const retainer = await this.getById(tenant, id)
    if (!isValidRetainerTransition(retainer.status, status)) {
      throw NextResponse.json(
        { error: `Cannot transition from '${retainer.status}' to '${status}'` },
        { status: 400 },
      )
    }
    const updated = await repo.updateStatus(tenant, id, status)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'RETAINER_STATUS_CHANGED',
      recordId: id,
      newValue: { from: retainer.status, to: status },
    })
    return updated
  }

  async delete(tenant: TenantContext, id: string) {
    requireManage(tenant)
    const retainer = await this.getById(tenant, id)
    if (retainer.status === 'active') {
      throw NextResponse.json(
        { error: 'Cancel the retainer before deleting it' },
        { status: 400 },
      )
    }
    await repo.delete(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'RETAINER_DELETED', recordId: id })
  }

  async listInvoices(tenant: TenantContext, retainerId: string) {
    requireView(tenant)
    await this.getById(tenant, retainerId)
    return repo.listInvoices(tenant, retainerId)
  }

  async createInvoice(tenant: TenantContext, retainerId: string, input: CreateRetainerInvoiceInput) {
    requireManage(tenant)
    const retainer = await this.getById(tenant, retainerId)
    const invoice = await repo.createInvoice(tenant, retainer, input)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'RETAINER_INVOICE_CREATED',
      recordId: retainerId,
      newValue: { invoiceNumber: invoice.invoiceNumber, billingPeriodStart: invoice.billingPeriodStart },
    })
    return invoice
  }

  async updateInvoice(
    tenant: TenantContext,
    retainerId: string,
    invoiceId: string,
    patch: UpdateRetainerInvoicePayload,
  ) {
    requireManage(tenant)
    await this.getById(tenant, retainerId)
    const invoice = await repo.updateInvoice(tenant, retainerId, invoiceId, {
      paymentStatus: patch.paymentStatus,
      amountPaid:    patch.amountPaid,
      paymentMethod: patch.paymentMethod ?? null,
      paidAt:        patch.paidAt ?? null,
      notes:         patch.notes ?? null,
    })
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'RETAINER_INVOICE_UPDATED',
      recordId: retainerId,
      newValue: { invoiceId, patch },
    })
    return invoice
  }

  async deleteInvoice(tenant: TenantContext, retainerId: string, invoiceId: string) {
    requireManage(tenant)
    await this.getById(tenant, retainerId)
    await repo.deleteInvoice(tenant, retainerId, invoiceId)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'RETAINER_INVOICE_DELETED',
      recordId: retainerId,
      newValue: { invoiceId },
    })
  }
}
