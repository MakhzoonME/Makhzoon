import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireAnyVerticalFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { AppointmentsService } from '@/lib/modules/haraka/appointments/appointments.service'
import { addAppointmentProductSchema } from '@/lib/modules/haraka/appointments/schemas'

const service = new AppointmentsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireHarakaModule(tenant, 'appointments')
    const { appointmentId } = await params
    const products = await service.listProducts(tenant, appointmentId)
    return NextResponse.json({ products })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/appointments/[appointmentId]/products]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireHarakaModule(tenant, 'appointments')
    const { appointmentId } = await params
    const body = await req.json()
    const parsed = addAppointmentProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const appointment = await service.addProduct(
      tenant,
      appointmentId,
      parsed.data.itemId,
      parsed.data.quantity,
      parsed.data.unitPrice,
    )
    const products = await service.listProducts(tenant, appointmentId)
    return NextResponse.json({ appointment, products }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/appointments/[appointmentId]/products]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
