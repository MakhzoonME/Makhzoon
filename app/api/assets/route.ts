import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { AssetsService } from '@/lib/modules/assets/services/assets.service'
import { createAssetSchema } from '@/lib/modules/assets/validators/schemas'

const service = new AssetsService()

export async function GET(_req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    return NextResponse.json(await service.getAll(tenant))
  } catch (err) {
    return err instanceof NextResponse ? err : NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const parsed = createAssetSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    return NextResponse.json(await service.create(tenant, parsed.data as any), { status: 201 })
  } catch (err) {
    return err instanceof NextResponse ? err : NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
