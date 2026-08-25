import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { CustomersService } from '@/lib/modules/haraka/customers/customers.service'
import { exportCustomersToCSV } from '@/lib/export/csv'

const service = new CustomersService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    // CustomersService.listAllForExport() enforces haraka.customersExport.
    const { searchParams } = new URL(req.url)
    const customers = await service.listAllForExport(tenant, searchParams.get('search') ?? undefined)

    const stamp = format(new Date(), 'yyyy-MM-dd')
    return new NextResponse(exportCustomersToCSV(customers), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-${stamp}.csv"`,
      },
    })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/customers/export]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
