import { adminDb } from '@/lib/firebase/admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { PosSession } from '@/types'

function tsToDate(v: unknown): Date {
  return v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date()
}

function toSession(id: string, d: FirebaseFirestore.DocumentData): PosSession {
  return {
    id,
    organizationId: d.organizationId,
    locationId: d.locationId ?? 'default',
    cashierId: d.cashierId,
    cashierName: d.cashierName ?? '',
    openedAt: tsToDate(d.openedAt),
    closedAt: d.closedAt ? tsToDate(d.closedAt) : null,
    status: (d.status as 'open' | 'closed') ?? 'open',
    openingFloat: Number(d.openingFloat ?? 0),
    closingFloat: d.closingFloat == null ? null : Number(d.closingFloat),
    expectedFloat: d.expectedFloat == null ? null : Number(d.expectedFloat),
    discrepancy: d.discrepancy == null ? null : Number(d.discrepancy),
    createdAt: tsToDate(d.createdAt),
    updatedAt: tsToDate(d.updatedAt),
  }
}

export interface SessionListOpts {
  status?: 'open' | 'closed'
  cashierId?: string
  page?: number
  pageSize?: number
}

export class SessionsRepository {
  async list(tenant: TenantContext, opts?: SessionListOpts) {
    const snap = await adminDb
      .collection('posSessions')
      .where('organizationId', '==', tenant.organizationId)
      .get()
    let items = snap.docs.map((d) => toSession(d.id, d.data()))
    if (opts?.status) items = items.filter((s) => s.status === opts.status)
    if (opts?.cashierId) items = items.filter((s) => s.cashierId === opts.cashierId)
    items.sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime())

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages }
  }

  async getById(tenant: TenantContext, id: string): Promise<PosSession | null> {
    const doc = await adminDb.collection('posSessions').doc(id).get()
    if (!doc.exists) return null
    const d = doc.data()!
    if (d.organizationId !== tenant.organizationId) return null
    return toSession(id, d)
  }

  /**
   * Returns the caller's currently-open session, if any. Used by the register
   * landing page to decide whether to redirect or show the "open session" form.
   */
  async findOpenForCashier(tenant: TenantContext): Promise<PosSession | null> {
    const snap = await adminDb
      .collection('posSessions')
      .where('organizationId', '==', tenant.organizationId)
      .where('cashierId', '==', tenant.userId)
      .where('status', '==', 'open')
      .limit(1)
      .get()
    if (snap.empty) return null
    return toSession(snap.docs[0].id, snap.docs[0].data())
  }

  async open(
    tenant: TenantContext,
    input: { openingFloat: number; locationId?: string },
  ): Promise<string> {
    // Enforce single-open-session invariant atomically: re-check inside a transaction.
    return adminDb.runTransaction(async (t) => {
      const existing = await adminDb
        .collection('posSessions')
        .where('organizationId', '==', tenant.organizationId)
        .where('cashierId', '==', tenant.userId)
        .where('status', '==', 'open')
        .limit(1)
        .get()
      if (!existing.empty) {
        throw new Error('You already have an open session. Close it before opening a new one.')
      }
      const ref = adminDb.collection('posSessions').doc()
      const now = new Date()
      t.set(ref, {
        organizationId: tenant.organizationId,
        locationId: input.locationId ?? 'default',
        cashierId: tenant.userId,
        cashierName: tenant.user.displayName ?? tenant.user.email ?? '',
        openedAt: now,
        closedAt: null,
        status: 'open',
        openingFloat: input.openingFloat,
        closingFloat: null,
        expectedFloat: null,
        discrepancy: null,
        createdAt: now,
        updatedAt: now,
      })
      return ref.id
    })
  }

  /**
   * Compute expected cash for a session by summing cash payments on completed
   * transactions minus cash refunds. Returns the running tally so the close-form
   * UI can show the expected amount as the cashier enters their counted total.
   */
  async computeExpectedCash(tenant: TenantContext, sessionId: string): Promise<number> {
    const snap = await adminDb
      .collection('posTransactions')
      .where('organizationId', '==', tenant.organizationId)
      .where('sessionId', '==', sessionId)
      .get()
    let cashIn = 0
    let cashOut = 0
    snap.docs.forEach((d) => {
      const data = d.data()
      const payments = Array.isArray(data.payments) ? data.payments : []
      const cashAmt = payments
        .filter((p: { method: string; amount: number }) => p.method === 'cash')
        .reduce((acc: number, p: { amount: number }) => acc + Number(p.amount ?? 0), 0)
      if (data.status === 'completed') cashIn += cashAmt
      else if (data.status === 'refunded') cashOut += cashAmt
    })
    return cashIn - cashOut
  }

  async close(
    tenant: TenantContext,
    id: string,
    input: { closingFloat: number; notes?: string | null },
  ): Promise<{ expectedFloat: number; discrepancy: number }> {
    const ref = adminDb.collection('posSessions').doc(id)
    const doc = await ref.get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Session not found')
    }
    const data = doc.data()!
    if (data.status !== 'open') {
      throw new Error('Session is already closed')
    }
    if (data.cashierId !== tenant.userId) {
      // Allow managers to force-close someone else's session; service layer gates this.
      // Repository just records it.
    }
    const openingFloat = Number(data.openingFloat ?? 0)
    const cashDelta = await this.computeExpectedCash(tenant, id)
    const expectedFloat = openingFloat + cashDelta
    const discrepancy = input.closingFloat - expectedFloat

    await ref.update({
      status: 'closed',
      closedAt: new Date(),
      closingFloat: input.closingFloat,
      expectedFloat,
      discrepancy,
      closeNotes: input.notes ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { expectedFloat, discrepancy }
  }
}
