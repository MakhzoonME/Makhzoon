import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireStaffAccess } from '@/lib/permissions/require-module'
import { StaffService } from '@/lib/modules/haraka/staff/staff.service'
import { staffUpdateSchema } from '@/lib/modules/haraka/staff/schemas'

const service = new StaffService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireStaffAccess(tenant)
    const { staffId } = await params
    const staff = await service.getById(tenant, staffId)
    return NextResponse.json({ staff })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/staff/[staffId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireStaffAccess(tenant)
    const { staffId } = await params
    const body = await req.json()
    const parsed = staffUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const staff = await service.update(tenant, staffId, parsed.data)
    return NextResponse.json({ staff })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/staff/[staffId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireStaffAccess(tenant)
    const { staffId } = await params
    await service.delete(tenant, staffId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/staff/[staffId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
