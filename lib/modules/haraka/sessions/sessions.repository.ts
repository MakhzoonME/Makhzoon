import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { PosSession } from '@/types'

type Row = Record<string, unknown>

function toSession(r: Row): PosSession {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    locationId: (r.location_id as string) ?? 'default',
    cashierId: r.cashier_id as string,
    cashierName: (r.cashier_name as string) ?? '',
    openedAt: r.opened_at ? new Date(r.opened_at as string) : new Date(),
    closedAt: r.closed_at ? new Date(r.closed_at as string) : null,
    status: ((r.status as string) ?? 'open') as 'open' | 'closed',
    openingFloat: Number(r.opening_float ?? 0),
    closingFloat: r.closing_float == null ? null : Number(r.closing_float),
    expectedFloat: r.expected_float == null ? null : Number(r.expected_float),
    discrepancy: r.discrepancy == null ? null : Number(r.discrepancy),
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
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
    let q = supabaseAdmin
      .from('pos_sessions')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (tenant.spaceId) q = q.eq('space_id', tenant.spaceId)
    if (opts?.status) q = q.eq('status', opts.status)
    if (opts?.cashierId) q = q.eq('cashier_id', opts.cashierId)
    const { data, error } = await q
    if (error) throw error
    const items = (data ?? [])
      .map(toSession)
      .sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime())

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return {
      items: items.slice(start, start + pageSize),
      total,
      page: safePage,
      pageSize,
      totalPages,
    }
  }

  async getById(
    tenant: TenantContext,
    id: string,
  ): Promise<PosSession | null> {
    const { data } = await supabaseAdmin
      .from('pos_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    if (tenant.spaceId && data.space_id !== tenant.spaceId) return null
    return toSession(data)
  }

  async findOpenForCashier(
    tenant: TenantContext,
  ): Promise<PosSession | null> {
    let q = supabaseAdmin
      .from('pos_sessions')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('cashier_id', tenant.userId)
      .eq('status', 'open')
    if (tenant.spaceId) q = q.eq('space_id', tenant.spaceId)
    const { data } = await q.limit(1).maybeSingle()
    return data ? toSession(data) : null
  }

  async open(
    tenant: TenantContext,
    input: { openingFloat: number; locationId?: string },
  ): Promise<string> {
    // Single-open-session invariant: re-check before insert. (Was a Firestore
    // transaction; read-then-write here — acceptable for internal/staging.)
    const existing = await this.findOpenForCashier(tenant)
    if (existing) {
      throw new Error(
        'You already have an open session. Close it before opening a new one.',
      )
    }
    const { data, error } = await supabaseAdmin
      .from('pos_sessions')
      .insert({
        organization_id: tenant.organizationId,
        space_id: tenant.spaceId,
        location_id: input.locationId ?? 'default',
        cashier_id: tenant.userId,
        cashier_name: tenant.user.displayName ?? tenant.user.email ?? '',
        status: 'open',
        opening_float: input.openingFloat,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
  }

  async computeExpectedCash(
    tenant: TenantContext,
    sessionId: string,
  ): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('pos_transactions')
      .select('status, payments')
      .eq('organization_id', tenant.organizationId)
      .eq('session_id', sessionId)
    if (error) throw error
    let cashIn = 0
    let cashOut = 0
    for (const d of data ?? []) {
      const payments = Array.isArray((d as Row).payments)
        ? ((d as Row).payments as Array<{ method: string; amount: number }>)
        : []
      const cashAmt = payments
        .filter((p) => p.method === 'cash')
        .reduce((acc, p) => acc + Number(p.amount ?? 0), 0)
      if ((d as Row).status === 'completed') cashIn += cashAmt
      else if ((d as Row).status === 'refunded') cashOut += cashAmt
    }
    return cashIn - cashOut
  }

  async close(
    tenant: TenantContext,
    id: string,
    input: { closingFloat: number; notes?: string | null },
  ): Promise<{ expectedFloat: number; discrepancy: number }> {
    const session = await this.getById(tenant, id)
    if (!session) throw new Error('Session not found')
    if (session.status !== 'open') {
      throw new Error('Session is already closed')
    }
    const openingFloat = Number(session.openingFloat ?? 0)
    const cashDelta = await this.computeExpectedCash(tenant, id)
    const expectedFloat = openingFloat + cashDelta
    const discrepancy = input.closingFloat - expectedFloat

    const { error } = await supabaseAdmin
      .from('pos_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_float: input.closingFloat,
        expected_float: expectedFloat,
        discrepancy,
        close_notes: input.notes ?? null,
      })
      .eq('id', id)
    if (error) throw error

    return { expectedFloat, discrepancy }
  }
}
