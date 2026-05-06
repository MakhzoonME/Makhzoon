import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { Asset } from '@/types/asset.types'
import type { CreateAssetInput } from '@/lib/services/assets.service'
import { AssetsRepository } from '@/lib/modules/assets/repositories/assets.repository'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { eventBus } from '@/lib/platform/events/event-bus'

export class AssetsService {
  private repo = new AssetsRepository()

  async getAll(tenant: TenantContext): Promise<Asset[]> {
    if (!hasPermission(tenant, 'assets', 'view'))
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return this.repo.getAll(tenant)
  }

  async create(tenant: TenantContext, input: CreateAssetInput): Promise<Asset> {
    if (!hasPermission(tenant, 'assets', 'create'))
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (tenant.subscription && !tenant.subscription.features['assets'])
      throw NextResponse.json({ error: 'Feature disabled' }, { status: 403 })

    const asset = await this.repo.create(tenant, input)
    await auditLog.create({ tenant, module: 'assets', action: 'ASSET_CREATED', recordId: asset.id, oldValue: null, newValue: asset as unknown as Record<string, unknown> })
    await eventBus.emit('ASSET_CREATED', { tenant, asset })
    return asset
  }
}
