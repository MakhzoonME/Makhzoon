import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireAnyVerticalFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { AppointmentsService } from '@/lib/modules/haraka/appointments/appointments.service'

const service = new AppointmentsService()

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string; productId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireHarakaModule(tenant, 'appointments')
    const { appointmentId, productId } = await params
    const appointment = await service.removeProduct(tenant, appointmentId, productId)
    return NextResponse.json({ appointment })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/appointments/[appointmentId]/products/[productId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
