import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requirePermission } from '@/lib/permissions/require'
import { CustomersService } from '@/lib/modules/haraka/customers/customers.service'
import { customerSchema } from '@/lib/modules/haraka/customers/schemas'

const service = new CustomersService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
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
    requirePermission(tenant.user, 'pos', 'process_sale')
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
