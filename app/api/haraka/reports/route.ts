import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { TransactionsService } from '@/lib/modules/haraka/transactions/transactions.service'
import type {
  AggregateGroupBy,
  AggregateResult,
} from '@/lib/modules/haraka/transactions/transactions.repository'

const service = new TransactionsService()

const groupBySchema = z.enum(['day', 'item', 'cashier', 'paymentMethod', 'session'])

const querySchema = z.object({
  groupBy: groupBySchema,
  from: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  to: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  topN: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  format: z.enum(['json', 'csv']).optional().default('json'),
})

function csvEscape(value: string | number): string {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv(result: AggregateResult): string {
  const isItem = result.groupBy === 'item'
  const isPayment = result.groupBy === 'paymentMethod'
  const header = isItem
    ? ['key', 'item', 'quantity', 'count', 'subtotal', 'tax', 'discount', 'total']
    : isPayment
      ? ['key', 'method', 'count', 'total']
      : ['key', 'label', 'count', 'subtotal', 'tax', 'discount', 'total']
  const rows = result.buckets.map((b) =>
    isItem
      ? [b.key, b.label, b.quantity ?? 0, b.count, b.subtotal.toFixed(2), b.taxAmount.toFixed(2), b.discountAmount.toFixed(2), b.total.toFixed(2)]
      : isPayment
        ? [b.key, b.label, b.count, b.total.toFixed(2)]
        : [b.key, b.label, b.count, b.subtotal.toFixed(2), b.taxAmount.toFixed(2), b.discountAmount.toFixed(2), b.total.toFixed(2)],
  )
  return [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const limited = await rateLimitTenant(tenant, 'haraka-reports', 30, 60_000)
    if (limited) return limited
    const { searchParams } = new URL(req.url)
    const parsed = querySchema.safeParse({
      groupBy: searchParams.get('groupBy') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      topN: searchParams.get('topN') ?? undefined,
      format: searchParams.get('format') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { groupBy, from, to, topN, format } = parsed.data
    const result = await service.aggregate(tenant, {
      groupBy: groupBy as AggregateGroupBy,
      from,
      to,
      topN,
    })

    if (format === 'csv') {
      const filename = `haraka-${groupBy}-${result.from.toISOString().slice(0, 10)}-to-${result.to
        .toISOString()
        .slice(0, 10)}.csv`
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
    console.error('[GET /api/haraka/reports]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
