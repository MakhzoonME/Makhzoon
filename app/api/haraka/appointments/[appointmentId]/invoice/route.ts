import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { AppointmentsService } from '@/lib/modules/haraka/appointments/appointments.service'

const service = new AppointmentsService()

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireHarakaModule(tenant, 'appointments')
    const { appointmentId } = await params
    const appointment = await service.generateInvoice(tenant, appointmentId)
    return NextResponse.json({ appointment, invoiceNumber: appointment.invoiceNumber })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/appointments/[appointmentId]/invoice]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
