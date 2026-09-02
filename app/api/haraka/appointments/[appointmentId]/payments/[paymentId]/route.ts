import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireAnyVerticalFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { AppointmentsService } from '@/lib/modules/haraka/appointments/appointments.service'
import { settleAppointmentPaymentSchema } from '@/lib/modules/haraka/appointments/schemas'

const service = new AppointmentsService()

/** Settles one 'unpaid' payment line to 'paid' or 'written_off'. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string; paymentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireHarakaModule(tenant, 'appointments')
    const { appointmentId, paymentId } = await params
    const body = await req.json()
    const parsed = settleAppointmentPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const appointment = await service.settlePayment(tenant, appointmentId, paymentId, parsed.data.status)
    const payments = await service.listPayments(tenant, appointmentId)
    return NextResponse.json({ appointment, payments })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/appointments/[appointmentId]/payments/[paymentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string; paymentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
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
