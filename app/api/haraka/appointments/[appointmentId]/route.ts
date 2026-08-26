import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireAnyVerticalFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { AppointmentsService } from '@/lib/modules/haraka/appointments/appointments.service'
import { updateAppointmentSchema } from '@/lib/modules/haraka/appointments/schemas'

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
    const appointment = await service.getById(tenant, appointmentId)
    return NextResponse.json({ appointment })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/appointments/[appointmentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireHarakaModule(tenant, 'appointments')
    const { appointmentId } = await params
    const body = await req.json()
    const parsed = updateAppointmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const appointment = await service.update(tenant, appointmentId, parsed.data)
    return NextResponse.json({ appointment })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/appointments/[appointmentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireHarakaModule(tenant, 'appointments')
    const { appointmentId } = await params
    await service.delete(tenant, appointmentId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/appointments/[appointmentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
