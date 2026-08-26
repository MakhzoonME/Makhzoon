import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { eventBus } from '@/lib/platform/events/event-bus'
import {
  CustomersRepository,
  type CustomerInput,
  type CustomerListOpts,
} from './customers.repository'
import { TransactionsRepository } from '@/lib/modules/haraka/transactions/transactions.repository'
import { OrdersRepository } from '@/lib/modules/haraka/orders/orders.repository'
import { AppointmentsRepository } from '@/lib/modules/haraka/appointments/appointments.repository'
import { ServiceJobsRepository } from '@/lib/modules/haraka/service-jobs/service-jobs.repository'
import { BannaRepository } from '@/lib/modules/banna/repositories/banna.repository'
import { ReportInstancesRepository } from '@/lib/modules/document-reports/instances.repository'
import { findMissingRequiredFields } from './required-fields'

const repo = new CustomersRepository()
const txRepo = new TransactionsRepository()
const ordersRepo = new OrdersRepository()
const appointmentsRepo = new AppointmentsRepository()
const serviceJobsRepo = new ServiceJobsRepository()
const bannaRepo = new BannaRepository()
const reportInstancesRepo = new ReportInstancesRepository()

/**
 * A single entry in a customer's activity timeline — a POS sale/refund, a
 * Haraka order, a booked appointment, a service job, or a generated document
 * report. All carry enough detail for the UI to render the row and link
 * through to the underlying record.
 */
export interface CustomerHistoryEntry {
  kind: 'transaction' | 'order' | 'appointment' | 'service_job' | 'document_report'
  id: string
  /** ISO timestamp used for sorting and display. */
  date: string
  /** Receipt number (transactions) or order number (orders). */
  reference: string
  status: string
  total: number
  itemCount: number
  /** Order invoice number, when issued. */
  invoiceNumber: string | null
  /** Payment method labels — 'cash', 'card', etc. */
  paymentMethods: string[]
  /** Orders only: unpaid / partial / paid. */
  paymentStatus: string | null
  /** Orders only: amount collected so far. */
  amountPaid: number | null
  /** Transactions only: set when this row is a refund of an earlier sale. */
  isRefund: boolean
}

function requireCustomers(
  tenant: TenantContext,
  op: 'customersView' | 'customersCreate' | 'customersUpdate' | 'customersDelete' | 'customersExport',
) {
  if (!hasPermission(tenant, 'haraka', op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class CustomersService {
  /**
   * Enforces the org's configured required/hidden state for the five default
   * customer fields (Name/Phone/Email/Tax number/Notes) — hidden always wins
   * over required. `input` may be a partial patch (PATCH), in which case only
   * the fields actually present are checked.
   */
  private async assertRequiredFields(tenant: TenantContext, input: Partial<CustomerInput>) {
    await bannaRepo.ensureDefaultCustomerFields(tenant)
    const allFields = await bannaRepo.getAll(tenant, { module: 'customers' })
    const defaults = (allFields as unknown as Record<string, unknown>[])
      .filter((f) => f.is_default === true)
      .map((f) => ({
        fieldKey: f.field_key as string,
        required: f.required as boolean,
        active: f.is_active as boolean,
      }))

    const missing = findMissingRequiredFields(defaults, input)
    if (missing.length > 0) {
      throw NextResponse.json(
        { error: { fieldErrors: Object.fromEntries(missing.map((key) => [key, ['This field is required']])) } },
        { status: 422 },
      )
    }
  }

  async list(tenant: TenantContext, opts?: CustomerListOpts) {
    requireCustomers(tenant, 'customersView')
    return repo.list(tenant, opts)
  }

  async listAllForExport(tenant: TenantContext, search?: string) {
    requireCustomers(tenant, 'customersExport')
    const { items } = await repo.list(tenant, { search, page: 1, pageSize: Number.MAX_SAFE_INTEGER })
    return items
  }

  async getById(tenant: TenantContext, id: string) {
    requireCustomers(tenant, 'customersView')
    const customer = await repo.getById(tenant, id)
    if (!customer) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return customer
  }

  /**
   * Unified activity timeline for one customer: POS transactions, Haraka
   * orders, appointments, and service jobs merged and sorted newest-first.
   * Verifies the customer belongs to the tenant (via getById) before returning
   * anything.
   */
  async history(tenant: TenantContext, customerId: string): Promise<CustomerHistoryEntry[]> {
    // getById enforces the permission check and 404s on a foreign/unknown id.
    const customer = await this.getById(tenant, customerId)

    // Match by id, plus a fallback on the snapshotted name/phone so legacy
    // sales/orders taken before this customer was linked still surface.
    const [txs, orders, appointmentsRes, serviceJobsRes, reportsRes] = await Promise.all([
      txRepo.listByCustomer(tenant, { id: customerId, name: customer.name }),
      ordersRepo.listByCustomer(tenant, {
        id: customerId,
        name: customer.name,
        phone: customer.phone,
      }),
      appointmentsRepo.list(tenant, { customerId, pageSize: 200 }),
      serviceJobsRepo.list(tenant, { customerId, pageSize: 200 }),
      reportInstancesRepo.list(tenant, { customerId, pageSize: 200 }),
    ])

    const entries: CustomerHistoryEntry[] = [
      ...txs.map((t): CustomerHistoryEntry => ({
        kind: 'transaction',
        id: t.id,
        date: t.createdAt.toISOString(),
        reference: t.receiptNumber,
        status: t.status,
        total: t.total,
        itemCount: t.items.length,
        invoiceNumber: null,
        paymentMethods: Array.from(new Set(t.payments.map((p) => p.method))),
        paymentStatus: null,
        amountPaid: null,
        isRefund: !!t.parentTransactionId || t.status === 'refunded',
      })),
      ...orders.map((o): CustomerHistoryEntry => ({
        kind: 'order',
        id: o.id,
        date: o.createdAt.toISOString(),
        reference: o.orderNumber,
        status: o.status,
        total: o.total,
        itemCount: o.items.length,
        invoiceNumber: o.invoiceNumber,
        paymentMethods: o.paymentMethod ? [o.paymentMethod] : [],
        paymentStatus: o.paymentStatus,
        amountPaid: o.amountPaid,
        isRefund: false,
      })),
      ...appointmentsRes.items.map((a): CustomerHistoryEntry => ({
        kind: 'appointment',
        id: a.id,
        date: a.scheduledAt.toISOString(),
        reference: a.appointmentNumber,
        status: a.status,
        total: a.total,
        itemCount: 1,
        invoiceNumber: a.invoiceNumber,
        paymentMethods: [],
        paymentStatus: a.paymentStatus,
        amountPaid: a.amountPaid,
        isRefund: false,
      })),
      ...serviceJobsRes.items.map((j): CustomerHistoryEntry => ({
        kind: 'service_job',
        id: j.id,
        date: j.createdAt.toISOString(),
        reference: j.jobNumber,
        status: j.status,
        total: j.total,
        itemCount: j.items.length,
        invoiceNumber: j.invoiceNumber,
        paymentMethods: j.paymentMethod ? [j.paymentMethod] : [],
        paymentStatus: j.paymentStatus,
        amountPaid: j.amountPaid,
        isRefund: false,
      })),
      ...reportsRes.items.map((r): CustomerHistoryEntry => ({
        kind: 'document_report',
        id: r.id,
        date: r.createdAt.toISOString(),
        reference: r.templateName,
        status: r.isEditable ? 'editable' : 'locked',
        total: 0,
        itemCount: 1,
        invoiceNumber: null,
        paymentMethods: [],
        paymentStatus: null,
        amountPaid: null,
        isRefund: false,
      })),
    ]

    entries.sort((a, b) => b.date.localeCompare(a.date))
    return entries
  }

  async create(tenant: TenantContext, input: CustomerInput) {
    requireCustomers(tenant, 'customersCreate')
    await this.assertRequiredFields(tenant, input)
    const id = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'POS_CUSTOMER_CREATED',
      recordId: id,
      newValue: { name: input.name, phone: input.phone ?? null, email: input.email ?? null },
    })
    await eventBus.emit('pos.customer.created', { tenant, id, input })
    return { id }
  }

  async update(tenant: TenantContext, id: string, input: Partial<CustomerInput>) {
    requireCustomers(tenant, 'customersUpdate')
    await this.assertRequiredFields(tenant, input)
    await repo.update(tenant, id, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'POS_CUSTOMER_UPDATED',
      recordId: id,
      newValue: input as Record<string, unknown>,
    })
    await eventBus.emit('pos.customer.updated', { tenant, id, input })
  }

  async delete(tenant: TenantContext, id: string) {
    requireCustomers(tenant, 'customersDelete')
    await repo.delete(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'POS_CUSTOMER_DELETED', recordId: id })
    await eventBus.emit('pos.customer.deleted', { tenant, id })
  }
}
