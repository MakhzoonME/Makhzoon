import 'server-only'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasVerticalPermission } from '@/lib/platform/permissions'

type Row = Record<string, unknown>

export type AnalyticsModuleKey = 'pos' | 'orders' | 'serviceJobs' | 'retainers' | 'appointments'

export interface ModuleSummary {
  /** Count of revenue-recognized records in range (sales / delivered orders / done jobs / invoiced cycles / completed appointments). */
  count: number
  revenue: number
}

export interface HarakaAnalytics {
  from: string
  to: string
  modules: Record<AnalyticsModuleKey, ModuleSummary>
  /** Combined revenue across all 5 sources, bucketed by day (YYYY-MM-DD), for the overview chart. */
  byDay: Array<{ date: string; revenue: number }>
  totals: { count: number; revenue: number }
}

function money(n: number): number {
  return Math.round(n * 10_000) / 10_000
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function requireAnalyticsAccess(tenant: TenantContext) {
  if (!hasVerticalPermission(tenant, 'analyticsView')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class AnalyticsService {
  async getSummary(
    tenant: TenantContext,
    from: Date,
    to: Date,
  ): Promise<HarakaAnalytics> {
    requireAnalyticsAccess(tenant)

    const fromIso = from.toISOString()
    const toIso = to.toISOString()
    const orgId = tenant.organizationId
    const spaceId = tenant.spaceId

    const dayRevenue = new Map<string, number>()
    const addToDay = (iso: string, amount: number) => {
      const key = dayKey(iso)
      dayRevenue.set(key, (dayRevenue.get(key) ?? 0) + amount)
    }

    // ── POS ────────────────────────────────────────────────────────────
    let pos = supabaseAdmin
      .from('pos_transactions')
      .select('total, status, parent_transaction_id, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
    if (spaceId) pos = pos.eq('space_id', spaceId)
    const posRes = await pos

    const posRows = ((posRes.data ?? []) as Row[]).filter(
      (r) => r.status === 'completed' && !r.parent_transaction_id,
    )
    let posRevenue = 0
    for (const r of posRows) {
      const total = Number(r.total ?? 0)
      posRevenue += total
      addToDay(r.created_at as string, total)
    }

    // ── Orders ─────────────────────────────────────────────────────────
    let orders = supabaseAdmin
      .from('haraka_orders')
      .select('total, status, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
    if (spaceId) orders = orders.eq('space_id', spaceId)
    const ordersRes = await orders

    const orderRows = ((ordersRes.data ?? []) as Row[]).filter(
      (r) => r.status === 'delivered' || r.status === 'picked_up',
    )
    let ordersRevenue = 0
    for (const r of orderRows) {
      const total = Number(r.total ?? 0)
      ordersRevenue += total
      addToDay(r.created_at as string, total)
    }

    // ── Service Jobs ───────────────────────────────────────────────────
    let jobs = supabaseAdmin
      .from('haraka_service_jobs')
      .select('total, status, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
    if (spaceId) jobs = jobs.eq('space_id', spaceId)
    const jobsRes = await jobs

    const jobRows = ((jobsRes.data ?? []) as Row[]).filter((r) => r.status === 'done')
    let jobsRevenue = 0
    for (const r of jobRows) {
      const total = Number(r.total ?? 0)
      jobsRevenue += total
      addToDay(r.created_at as string, total)
    }

    // ── Retainers ──────────────────────────────────────────────────────
    // haraka_retainer_invoices has no space_id — scope through the parent
    // retainer's ids when a space is active, then sum invoices directly
    // (each row is already a discrete billed cycle, no status filter needed).
    let retainerIds: string[] | null = null
    if (spaceId) {
      const { data } = await supabaseAdmin
        .from('haraka_retainers')
        .select('id')
        .eq('organization_id', orgId)
        .eq('space_id', spaceId)
      retainerIds = ((data ?? []) as Row[]).map((r) => r.id as string)
    }

    let retainerInvoices = supabaseAdmin
      .from('haraka_retainer_invoices')
      .select('total, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
    if (retainerIds) retainerInvoices = retainerInvoices.in('retainer_id', retainerIds)
    const retainersRes = retainerIds?.length === 0
      ? { data: [] as Row[] }
      : await retainerInvoices

    const retainerRows = (retainersRes.data ?? []) as Row[]
    let retainersRevenue = 0
    for (const r of retainerRows) {
      const total = Number(r.total ?? 0)
      retainersRevenue += total
      addToDay(r.created_at as string, total)
    }

    // ── Appointments ───────────────────────────────────────────────────
    let appts = supabaseAdmin
      .from('haraka_appointments')
      .select('total, status, scheduled_at')
      .eq('organization_id', orgId)
      .gte('scheduled_at', fromIso)
      .lte('scheduled_at', toIso)
    if (spaceId) appts = appts.eq('space_id', spaceId)
    const apptsRes = await appts

    const apptRows = ((apptsRes.data ?? []) as Row[]).filter((r) => r.status === 'completed')
    let apptsRevenue = 0
    for (const r of apptRows) {
      const total = Number(r.total ?? 0)
      apptsRevenue += total
      addToDay(r.scheduled_at as string, total)
    }

    const modules: Record<AnalyticsModuleKey, ModuleSummary> = {
      pos:            { count: posRows.length, revenue: money(posRevenue) },
      orders:         { count: orderRows.length, revenue: money(ordersRevenue) },
      serviceJobs:    { count: jobRows.length, revenue: money(jobsRevenue) },
      retainers:      { count: retainerRows.length, revenue: money(retainersRevenue) },
      appointments:   { count: apptRows.length, revenue: money(apptsRevenue) },
    }

    const byDay = [...dayRevenue.entries()]
      .map(([date, revenue]) => ({ date, revenue: money(revenue) }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const totals = Object.values(modules).reduce(
      (acc, m) => ({ count: acc.count + m.count, revenue: money(acc.revenue + m.revenue) }),
      { count: 0, revenue: 0 },
    )

    return { from: fromIso, to: toIso, modules, byDay, totals }
  }
}
