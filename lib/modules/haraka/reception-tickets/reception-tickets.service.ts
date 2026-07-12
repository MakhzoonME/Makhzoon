import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import type { HarakaReceptionTicket, PosTransaction } from '@/types'
import type { CartLineInput } from '@/lib/modules/haraka/pricing/calc'
import { paymentsCoverTotal } from '@/lib/modules/haraka/pricing/calc'
import { ServiceJobsRepository } from '@/lib/modules/haraka/service-jobs/service-jobs.repository'
import { isValidTransition } from '@/lib/modules/haraka/service-jobs/schemas'
import { TransactionsService } from '@/lib/modules/haraka/transactions/transactions.service'
import {
  ReceptionTicketsRepository,
  type ListTicketsOpts,
} from './reception-tickets.repository'
import type {
  CreateTicketPayload,
  UpdateTicketPayload,
  CheckoutTicketPayload,
} from './schemas'

const repo = new ReceptionTicketsRepository()
const jobsRepo = new ServiceJobsRepository()
const transactions = new TransactionsService()

type ServiceItem = CreateTicketPayload['serviceItems'][number]
type Payment = CheckoutTicketPayload['payments'][number]

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'view_reception')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireManage(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'manage_reception')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function productLines(items: CreateTicketPayload['items']): CartLineInput[] {
  return items.map((l) => ({
    itemId:    l.itemId,
    itemName:  l.itemName,
    sku:       l.sku ?? null,
    barcode:   l.barcode ?? null,
    quantity:  l.quantity,
    unitPrice: l.unitPrice,
    taxRateId: l.taxRateId ?? null,
    taxRate:   l.taxRate ?? 0,
    discount:  l.discount ?? 0,
  }))
}

// Service jobs store free-text lines in the CartLineInput shape (itemId '').
function serviceLines(items: ServiceItem[]): CartLineInput[] {
  return items.map((l) => ({
    itemId:    '',
    itemName:  l.name,
    sku:       null,
    barcode:   null,
    quantity:  l.quantity,
    unitPrice: l.unitPrice,
    taxRateId: null,
    taxRate:   l.taxRate ?? 0,
    discount:  l.discountAmount ?? 0,
  }))
}

const r4 = (n: number) => Math.round(n * 10000) / 10000

/** customer_name is NOT NULL on tickets and jobs — when the receptionist only
 *  entered a phone or car plate, fall back to those for the display name. */
function displayName(v: {
  customerName?: string | null
  carPlate?: string | null
  customerPhone?: string | null
}): string {
  return v.customerName?.trim() || v.carPlate?.trim() || v.customerPhone?.trim() || 'Walk-in'
}

/**
 * Take payments (in entry order) until `target` is covered — used to split
 * the cashier's payments between the POS transaction (products) and the
 * service-job payment (services). Splits a straddling payment line.
 */
function apportion(payments: Payment[], target: number): Payment[] {
  const out: Payment[] = []
  let remaining = r4(target)
  for (const p of payments) {
    if (remaining <= 0.0001) break
    const take = r4(Math.min(p.amount, remaining))
    if (take > 0) {
      out.push({ ...p, amount: take })
      remaining = r4(remaining - take)
    }
  }
  if (out.length === 0 && payments.length > 0) {
    out.push({ ...payments[0], amount: 0 })
  }
  return out
}

export class ReceptionTicketsService {
  async list(tenant: TenantContext, opts?: ListTicketsOpts) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaReceptionTicket> {
    requireView(tenant)
    const ticket = await repo.getById(tenant, id)
    if (!ticket) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return ticket
  }

  async create(tenant: TenantContext, input: CreateTicketPayload): Promise<HarakaReceptionTicket> {
    requireManage(tenant)
    const name = displayName(input)

    let serviceJobId: string | null = null
    let servicesTotal = 0
    if (input.serviceItems.length > 0) {
      const job = await jobsRepo.create(tenant, {
        customerName:  name,
        customerPhone: input.customerPhone ?? null,
        customerId:    input.customerId ?? null,
        lines:         serviceLines(input.serviceItems),
        scheduledAt:   input.scheduledAt ?? null,
        notes:         input.notes ?? null,
        createdById:   tenant.userId,
      })
      serviceJobId = job.id
      servicesTotal = job.total
    }

    const ticket = await repo.create(tenant, {
      customerName:  name,
      customerPhone: input.customerPhone ?? null,
      carPlate:      input.carPlate ?? null,
      customerId:    input.customerId ?? null,
      productLines:  productLines(input.items),
      serviceJobId,
      servicesTotal,
      scheduledAt:   input.scheduledAt ?? null,
      notes:         input.notes ?? null,
      createdById:   tenant.userId,
    })
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'RECEPTION_TICKET_CREATED',
      recordId: ticket.id,
      newValue: { ticketNumber: ticket.ticketNumber, grandTotal: ticket.grandTotal, serviceJobId },
    })
    return ticket
  }

  async update(tenant: TenantContext, id: string, patch: UpdateTicketPayload): Promise<HarakaReceptionTicket> {
    requireManage(tenant)
    const ticket = await this.getById(tenant, id)
    if (ticket.status !== 'open') {
      throw NextResponse.json({ error: 'Only open tickets can be edited' }, { status: 409 })
    }

    let serviceJobId = ticket.serviceJobId
    let servicesTotal: number | undefined

    // Recompute the display name when any identity field is part of the patch.
    const identityTouched =
      patch.customerName !== undefined || patch.customerPhone !== undefined || patch.carPlate !== undefined
    const name = identityTouched
      ? displayName({
          customerName:  patch.customerName  !== undefined ? patch.customerName  : ticket.customerName,
          customerPhone: patch.customerPhone !== undefined ? patch.customerPhone : ticket.customerPhone,
          carPlate:      patch.carPlate      !== undefined ? patch.carPlate      : ticket.carPlate,
        })
      : ticket.customerName

    if (patch.serviceItems !== undefined) {
      const job = ticket.serviceJobId ? await jobsRepo.getById(tenant, ticket.serviceJobId) : null

      if (patch.serviceItems.length === 0) {
        // Service lines removed — cancel the linked job while it hasn't started.
        if (job) {
          if (!isValidTransition(job.status, 'cancelled')) {
            throw NextResponse.json(
              { error: `Cannot remove services — job ${job.jobNumber} is already ${job.status.replace('_', ' ')}` },
              { status: 409 },
            )
          }
          await jobsRepo.updateStatus(tenant, job.id, 'cancelled')
        }
        serviceJobId = null
        servicesTotal = 0
      } else if (!job) {
        const created = await jobsRepo.create(tenant, {
          customerName:  name,
          customerPhone: patch.customerPhone !== undefined ? patch.customerPhone : ticket.customerPhone,
          customerId:    patch.customerId !== undefined ? patch.customerId : ticket.customerId,
          lines:         serviceLines(patch.serviceItems),
          scheduledAt:   patch.scheduledAt !== undefined
            ? patch.scheduledAt
            : ticket.scheduledAt?.toISOString() ?? null,
          notes:         patch.notes !== undefined ? patch.notes : ticket.notes,
          createdById:   tenant.userId,
        })
        serviceJobId = created.id
        servicesTotal = created.total
      } else {
        // Sync lines onto the linked job while it's still editable.
        if (job.status !== 'new' && job.status !== 'confirmed') {
          throw NextResponse.json(
            { error: `Cannot edit services — job ${job.jobNumber} is already ${job.status.replace('_', ' ')}` },
            { status: 409 },
          )
        }
        if (job.amountPaid > 0) {
          throw NextResponse.json(
            { error: `Cannot edit services — job ${job.jobNumber} already has payments recorded` },
            { status: 409 },
          )
        }
        const updated = await jobsRepo.replaceItems(tenant, job.id, serviceLines(patch.serviceItems))
        servicesTotal = updated.total
      }
    }

    // Keep the linked job's schedule in step with the ticket's.
    if ('scheduledAt' in patch && serviceJobId) {
      await jobsRepo.update(tenant, serviceJobId, { scheduledAt: patch.scheduledAt ?? null })
    }

    const result = await repo.update(tenant, id, {
      ...(identityTouched ? { customerName: name } : {}),
      ...('customerPhone' in patch ? { customerPhone: patch.customerPhone ?? null } : {}),
      ...('carPlate'      in patch ? { carPlate: patch.carPlate ?? null } : {}),
      ...('customerId'    in patch ? { customerId: patch.customerId ?? null } : {}),
      ...('scheduledAt'   in patch ? { scheduledAt: patch.scheduledAt ?? null } : {}),
      ...('notes'         in patch ? { notes: patch.notes ?? null } : {}),
      ...(patch.items !== undefined ? { productLines: productLines(patch.items) } : {}),
      serviceJobId,
      ...(servicesTotal !== undefined ? { servicesTotal } : {}),
    })
    auditLog.queue({ tenant, module: 'pos', action: 'RECEPTION_TICKET_UPDATED', recordId: id, newValue: patch })
    return result
  }

  async cancel(tenant: TenantContext, id: string): Promise<HarakaReceptionTicket> {
    requireManage(tenant)
    const ticket = await this.getById(tenant, id)
    if (ticket.status !== 'open') {
      throw NextResponse.json({ error: 'Only open tickets can be cancelled' }, { status: 409 })
    }
    // Cancel the linked job while it hasn't started; once in progress or done
    // the job keeps its own lifecycle and is settled from the Services page.
    if (ticket.serviceJobId) {
      const job = await jobsRepo.getById(tenant, ticket.serviceJobId)
      if (job && isValidTransition(job.status, 'cancelled')) {
        await jobsRepo.updateStatus(tenant, job.id, 'cancelled')
      }
    }
    const cancelled = await repo.setCancelled(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'RECEPTION_TICKET_CANCELLED', recordId: id })
    return cancelled
  }

  /**
   * Cashier checkout — one action, two ledgers:
   *  - product lines settle as a normal POS transaction (stock decremented,
   *    Fawtara submitted) via TransactionsService.completeSale;
   *  - the service balance settles as a payment on the linked service job.
   * Payments are apportioned to products first, in entry order.
   */
  async checkout(
    tenant: TenantContext,
    id: string,
    payload: CheckoutTicketPayload,
  ): Promise<{ ticket: HarakaReceptionTicket; transaction: PosTransaction | null }> {
    if (!hasPermission(tenant, 'pos', 'process_sale')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const ticket = await this.getById(tenant, id)
    if (ticket.status !== 'open') {
      throw NextResponse.json({ error: 'Ticket is already settled' }, { status: 409 })
    }
    if (!paymentsCoverTotal(ticket.grandTotal, payload.payments)) {
      throw NextResponse.json({ error: 'Payments do not cover the ticket total' }, { status: 400 })
    }

    // Product leg — skipped on retry when a previous attempt already charged.
    let transaction: PosTransaction | null = null
    if (ticket.items.length > 0 && !ticket.posTransactionId) {
      transaction = await transactions.completeSale(tenant, {
        sessionId:    payload.sessionId,
        customerId:   ticket.customerId,
        customerName: ticket.customerName,
        lines: ticket.items.map((l) => ({
          itemId:    l.inventoryItemId,
          itemName:  l.inventoryItemName,
          sku:       l.sku,
          barcode:   l.barcode,
          quantity:  l.quantity,
          unitPrice: l.unitPrice,
          taxRateId: l.taxRateId,
          taxRate:   l.taxRate,
          discount:  l.discountAmount,
        })),
        payments:    apportion(payload.payments, ticket.productsTotal),
        offlineId:   payload.offlineId,
        skipFawtara: payload.skipFawtara,
      })
      await repo.setPosTransaction(tenant, id, transaction.id)
    }

    // Service leg — settle the remaining balance on the linked job.
    if (ticket.serviceJobId) {
      const job = await jobsRepo.getById(tenant, ticket.serviceJobId)
      if (job && job.status !== 'cancelled') {
        const balance = r4(job.total - job.amountPaid)
        if (balance > 0) {
          const method = payload.payments[payload.payments.length - 1]?.method ?? null
          await jobsRepo.addPayment(
            tenant, job.id, balance, method, `Reception ticket ${ticket.ticketNumber}`,
          )
        }
      }
    }

    const paid = await repo.setPaid(tenant, id)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'RECEPTION_TICKET_PAID',
      recordId: id,
      newValue: {
        ticketNumber:  ticket.ticketNumber,
        grandTotal:    ticket.grandTotal,
        transactionId: transaction?.id ?? ticket.posTransactionId,
      },
    })
    return { ticket: paid, transaction }
  }
}
