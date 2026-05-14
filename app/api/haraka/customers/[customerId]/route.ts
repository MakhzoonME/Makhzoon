import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { CustomersService } from '@/lib/modules/haraka/customers/customers.service'
import { customerUpdateSchema } from '@/lib/modules/haraka/customers/schemas'

const service = new CustomersService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { customerId } = await params
    const customer = await service.getById(tenant, customerId)
    return NextResponse.json({ customer })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/customers/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { customerId } = await params
    const body = await req.json()
    const parsed = customerUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    await service.update(tenant, customerId, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[PATCH /api/haraka/customers/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { customerId } = await params
    await service.delete(tenant, customerId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[DELETE /api/haraka/customers/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
