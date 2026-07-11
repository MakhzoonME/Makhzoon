import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requirePermission } from '@/lib/permissions/require'
import { FawtaraConfigService } from '@/lib/modules/haraka/fawtara/config.service'

const service = new FawtaraConfigService()

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(['sandbox', 'production']).optional(),
  taxpayerNumber: z.string().nullable().optional(),
  activityNumber: z.string().nullable().optional(),
  invoiceTypeDefault: z.enum(['income', 'general']).optional(),
  vatRegistered: z.boolean().optional(),
  clientId: z.string().nullable().optional(),
  clientSecret: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const config = await service.get(tenant)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/jo-fotara/config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requirePermission(tenant.user, 'settings', 'fawtara')
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const config = await service.update(tenant, parsed.data)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[PATCH /api/jo-fotara/config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
