import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { AnalyticsService } from '@/lib/modules/haraka/analytics/analytics.service'
import type { HarakaAnalytics } from '@/lib/modules/haraka/analytics/analytics.service'

const service = new AnalyticsService()

const querySchema = z.object({
  from: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  to: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  format: z.enum(['json', 'csv']).optional().default('json'),
})

const MODULE_LABELS: Record<keyof HarakaAnalytics['modules'], string> = {
  pos: 'Point of Sale',
  orders: 'Orders',
  serviceJobs: 'Service Jobs',
  retainers: 'Retainers',
  appointments: 'Appointments',
}

function csvEscape(value: string | number): string {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv(result: HarakaAnalytics): string {
  const lines: string[] = []
  lines.push(['module', 'count', 'revenue'].join(','))
  for (const [key, summary] of Object.entries(result.modules)) {
    lines.push(
      [MODULE_LABELS[key as keyof HarakaAnalytics['modules']], summary.count, summary.revenue.toFixed(2)]
        .map(csvEscape)
        .join(','),
    )
  }
  lines.push('')
  lines.push(['date', 'revenue'].join(','))
  for (const b of result.byDay) {
    lines.push([b.date, b.revenue.toFixed(2)].map(csvEscape).join(','))
  }
  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const limited = await rateLimitTenant(tenant, 'haraka-analytics', 30, 60_000)
    if (limited) return limited

    const { searchParams } = new URL(req.url)
    const parsed = querySchema.safeParse({
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      format: searchParams.get('format') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { from, to, format } = parsed.data
    const now = new Date()
    const rangeTo = to ?? now
    const rangeFrom = from ?? new Date(rangeTo.getTime() - 30 * 24 * 60 * 60 * 1000)

    const result = await service.getSummary(tenant, rangeFrom, rangeTo)

    if (format === 'csv') {
      const filename = `haraka-analytics-${result.from.slice(0, 10)}-to-${result.to.slice(0, 10)}.csv`
      return new NextResponse(toCsv(result), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/analytics]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
