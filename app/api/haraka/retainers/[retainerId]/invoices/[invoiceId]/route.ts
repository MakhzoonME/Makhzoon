import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { RetainersService } from '@/lib/modules/haraka/retainers/retainers.service'
import { updateRetainerInvoiceSchema } from '@/lib/modules/haraka/retainers/schemas'

const service = new RetainersService()

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ retainerId: string; invoiceId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { retainerId, invoiceId } = await params
    const body = await req.json()
    const parsed = updateRetainerInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const invoice = await service.updateInvoice(tenant, retainerId, invoiceId, parsed.data)
    return NextResponse.json({ invoice })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[PATCH /api/haraka/retainers/[retainerId]/invoices/[invoiceId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ retainerId: string; invoiceId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { retainerId, invoiceId } = await params
    await service.deleteInvoice(tenant, retainerId, invoiceId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[DELETE /api/haraka/retainers/[retainerId]/invoices/[invoiceId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
