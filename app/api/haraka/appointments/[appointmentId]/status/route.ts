import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { AppointmentsService } from '@/lib/modules/haraka/appointments/appointments.service'
import { updateAppointmentStatusSchema } from '@/lib/modules/haraka/appointments/schemas'

const service = new AppointmentsService()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireHarakaModule(tenant, 'appointments')
    const { appointmentId } = await params
    const body = await req.json()
    const parsed = updateAppointmentStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const appointment = await service.updateStatus(tenant, appointmentId, parsed.data.status)
    return NextResponse.json({ appointment })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/appointments/[appointmentId]/status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
