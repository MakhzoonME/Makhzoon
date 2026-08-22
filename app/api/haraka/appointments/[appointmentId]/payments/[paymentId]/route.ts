import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { AppointmentsService } from '@/lib/modules/haraka/appointments/appointments.service'

const service = new AppointmentsService()

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string; paymentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireHarakaModule(tenant, 'appointments')
    const { appointmentId, paymentId } = await params
    const appointment = await service.removePayment(tenant, appointmentId, paymentId)
    return NextResponse.json({ appointment })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/appointments/[appointmentId]/payments/[paymentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
