import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { RetainersService } from '@/lib/modules/haraka/retainers/retainers.service'
import { createRetainerInvoiceSchema } from '@/lib/modules/haraka/retainers/schemas'

const service = new RetainersService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ retainerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { retainerId } = await params
    const invoices = await service.listInvoices(tenant, retainerId)
    return NextResponse.json({ invoices })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/retainers/[retainerId]/invoices]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ retainerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { retainerId } = await params
    const body = await req.json()
    const parsed = createRetainerInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const invoice = await service.createInvoice(tenant, retainerId, {
      billingPeriodStart: parsed.data.billingPeriodStart,
      billingPeriodEnd:   parsed.data.billingPeriodEnd,
      dueDate:            parsed.data.dueDate ?? null,
      notes:              parsed.data.notes ?? null,
    })
    return NextResponse.json({ invoice }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/retainers/[retainerId]/invoices]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
