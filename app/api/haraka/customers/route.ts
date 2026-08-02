import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requirePermission } from '@/lib/permissions/require'
import { hasPermission } from '@/lib/permissions'
import { CustomersService } from '@/lib/modules/haraka/customers/customers.service'
import { customerSchema } from '@/lib/modules/haraka/customers/schemas'

const service = new CustomersService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      pageSize: searchParams.get('pageSize')
        ? parseInt(searchParams.get('pageSize')!, 10)
        : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/customers]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    // A cashier (process_sale) or a front-desk user building a cart/receipt
    // (add_receipt_items) can both add a walk-in customer profile.
    if (!hasPermission(tenant.user, 'pos', 'process_sale')) {
      requirePermission(tenant.user, 'pos', 'add_receipt_items')
    }
    const body = await req.json()
    const parsed = customerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const result = await service.create(tenant, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/haraka/customers]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
