import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { notificationQueue } from '@/lib/notifications/notification-queue'
import { eventBus } from '@/lib/platform/events/event-bus'
import {
  TransactionsRepository,
  type AggregateGroupBy,
  type AggregateResult,
  type CompleteSaleInput,
} from './transactions.repository'
import { FawtaraService } from '@/lib/modules/haraka/fawtara/service'

const repo = new TransactionsRepository()
const fawtara = new FawtaraService()

/**
 * Submit a transaction to Fawtara asynchronously without blocking the caller.
 * Errors are recorded on the transaction doc (status: 'failed') and surfaced
 * via the retry queue — they never bubble up to the cashier.
 */
function fireAndForgetFawtara(tenant: TenantContext, transactionId: string) {
  fawtara
    .submitTransaction(tenant, transactionId)
    .catch((err) => console.error('[Fawtara] async submit failed', err))
}

function requirePos(tenant: TenantContext, op: keyof Required<NonNullable<TenantContext['user']['permissions']>>['pos']) {
  if (!hasPermission(tenant, 'pos', op as string)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireActiveSubscription(tenant: TenantContext) {
  if (tenant.subscription && tenant.subscription.status !== 'ACTIVE') {
    throw NextResponse.json({ error: 'Subscription inactive' }, { status: 403 })
  }
}

export class TransactionsService {
  async list(tenant: TenantContext, opts?: { sessionId?: string; status?: 'completed' | 'refunded' | 'voided'; page?: number; pageSize?: number }) {
    // Cashiers can list their own session; managers can list any.
    if (opts?.sessionId) {
      if (!hasPermission(tenant, 'pos', 'open_session') && !hasPermission(tenant, 'pos', 'view_reports')) {
        throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      requirePos(tenant, 'view_reports')
    }
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    const tx = await repo.getById(tenant, id)
    if (!tx) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isOwn = tx.cashierId === tenant.userId
    if (!isOwn && !hasPermission(tenant, 'pos', 'view_reports')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return tx
  }

  async completeSale(tenant: TenantContext, input: CompleteSaleInput) {
    requirePos(tenant, 'process_sale')
    requireActiveSubscription(tenant)
    const hasDiscount = input.lines.some((l) => l.discount > 0)
    if (hasDiscount) requirePos(tenant, 'apply_discount')
    const tx = await repo.completeSale(tenant, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'POS_SALE_COMPLETED',
      recordId: tx.id,
      newValue: { receiptNumber: tx.receiptNumber, total: tx.total, lineCount: tx.items.length },
    })
    await eventBus.emit('pos.transaction.completed', { tenant, transaction: tx })
    // Fawtara submission is async unless the cashier explicitly bypassed it.
    if (!input.skipFawtara) {
      fireAndForgetFawtara(tenant, tx.id)
    }
    return tx
  }

  async voidSale(tenant: TenantContext, id: string) {
    requirePos(tenant, 'void_transaction')
    await repo.voidTransaction(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'POS_SALE_VOIDED', recordId: id })
    notificationQueue.enqueue({ tenant, eventType: 'pos.sale_voided', data: { id }, link: `/haraka/transactions/${id}`, titleOverride: 'Sale voided' })
    await eventBus.emit('pos.transaction.voided', { tenant, id })
  }

  async aggregate(
    tenant: TenantContext,
    opts: { from?: Date; to?: Date; groupBy: AggregateGroupBy; topN?: number },
  ): Promise<AggregateResult> {
    requirePos(tenant, 'view_reports')
    return repo.aggregate(tenant, opts)
  }

  async refundSale(tenant: TenantContext, id: string, opts: { lineIndexes?: number[]; reason?: string }) {
    requirePos(tenant, 'issue_refund')
    const result = await repo.refundTransaction(tenant, id, opts)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'POS_SALE_REFUNDED',
      recordId: id,
      newValue: { refundTransactionId: result.refundTransactionId, reason: opts.reason ?? null },
    })
    await eventBus.emit('pos.transaction.refunded', { tenant, id, ...result })
    notificationQueue.enqueue({ tenant, eventType: 'pos.refund_issued', data: { id, reason: opts.reason ?? null }, link: `/haraka/transactions/${id}`, titleOverride: 'Refund issued' })
    // A refund creates a new transaction with parentTransactionId set — submit it
    // as a credit-note to Fawtara (the mapper picks up the parent reference).
    if (result.refundTransactionId) fireAndForgetFawtara(tenant, result.refundTransactionId)
    return result
  }
}
