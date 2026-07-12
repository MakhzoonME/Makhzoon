import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { eventBus } from '@/lib/platform/events/event-bus'
import { SessionsRepository, type SessionListOpts } from './sessions.repository'

const repo = new SessionsRepository()

function requirePos(tenant: TenantContext, op: 'open_session' | 'close_session' | 'view_all_sessions') {
  if (!hasPermission(tenant, 'pos', op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireActiveSubscription(tenant: TenantContext) {
  if (tenant.subscription && tenant.subscription.status !== 'ACTIVE') {
    throw NextResponse.json({ error: 'Subscription inactive' }, { status: 403 })
  }
}

export class SessionsService {
  async list(tenant: TenantContext, opts?: SessionListOpts) {
    // Anyone with open_session can list their own sessions; view_all_sessions
    // can list everyone's (mirrors getById's self-vs-any rule below).
    const canViewAny = hasPermission(tenant, 'pos', 'view_all_sessions')
    if (!canViewAny) {
      requirePos(tenant, 'open_session')
      if (opts?.cashierId && opts.cashierId !== tenant.userId) {
        throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return repo.list(tenant, { ...opts, cashierId: tenant.userId })
    }
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    // Cash/discrepancy detail is only for whoever is trusted to reconcile a
    // session: the cashier who can close their own (close_session), or
    // anyone with oversight (view_all_sessions). Being able to merely open
    // a session (e.g. a front-desk profile) is NOT sufficient — that persona
    // uses the register, not this cash-reconciliation view, even for their
    // own session.
    const session = await repo.getById(tenant, id)
    if (!session) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isOwn = session.cashierId === tenant.userId
    const canView = isOwn
      ? hasPermission(tenant, 'pos', 'close_session') || hasPermission(tenant, 'pos', 'view_all_sessions')
      : hasPermission(tenant, 'pos', 'view_all_sessions')
    if (!canView) throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const expectedCashDelta = await repo.computeExpectedCash(tenant, id)
    return { session, expectedCashSoFar: session.openingFloat + expectedCashDelta }
  }

  async findOpen(tenant: TenantContext) {
    // A user who can never open a session (e.g. a front-desk-only staffer)
    // can never have one — return null rather than 403 so pages that poll
    // "do I have an open session" (like the register) don't hard-fail for
    // personas that legitimately use the register without ever opening one.
    if (!hasPermission(tenant, 'pos', 'open_session')) return null
    return repo.findOpenForCashier(tenant)
  }

  async open(tenant: TenantContext, input: { openingFloat: number; locationId?: string }) {
    requirePos(tenant, 'open_session')
    requireActiveSubscription(tenant)
    const id = await repo.open(tenant, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'POS_SESSION_OPENED',
      recordId: id,
      newValue: { openingFloat: input.openingFloat },
    })
    await eventBus.emit('pos.session.opened', { tenant, sessionId: id })
    return { id }
  }

  async close(tenant: TenantContext, id: string, input: { closingFloat: number; notes?: string | null }) {
    // Cashier can close their own; manager/admin can force-close anyone's.
    const session = await repo.getById(tenant, id)
    if (!session) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (session.cashierId === tenant.userId) {
      // close_session is meaningless without open_session — enforce the
      // dependency server-side too, not just as a UI constraint in the
      // permissions settings screen.
      requirePos(tenant, 'open_session')
      requirePos(tenant, 'close_session')
    } else {
      requirePos(tenant, 'view_all_sessions')
    }
    const result = await repo.close(tenant, id, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'POS_SESSION_CLOSED',
      recordId: id,
      newValue: {
        closingFloat: input.closingFloat,
        expectedFloat: result.expectedFloat,
        discrepancy: result.discrepancy,
      },
    })
    await eventBus.emit('pos.session.closed', { tenant, sessionId: id, result })
    return result
  }
}
