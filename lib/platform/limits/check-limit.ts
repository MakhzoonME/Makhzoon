import { NextResponse } from 'next/server'
import { getPackageById } from '@/lib/db/packages'
import { getOrgUsage } from '@/lib/db/usage'
import type { TenantContext } from '@/lib/platform/tenancy/types'

type LimitedResource = 'assets' | 'users' | 'warranties' | 'requests' | 'spaces' | 'inventoryItems'

const LIMIT_KEYS: Record<LimitedResource, keyof import('@/types').PackageLimits> = {
  assets: 'maxAssets',
  users: 'maxUsers',
  warranties: 'maxWarranties',
  requests: 'maxRequests',
  spaces: 'maxSpaces',
  inventoryItems: 'maxInventoryItems',
}

export async function checkResourceLimit(tenant: TenantContext, resource: LimitedResource): Promise<void> {
  const packageId = tenant.subscription?.packageId
  if (!packageId) return // trial or no package = unlimited

  const pkg = await getPackageById(packageId)
  if (!pkg) return

  const limitKey = LIMIT_KEYS[resource]
  const limit = pkg.limits[limitKey] ?? -1
  if (limit === -1) return // -1 means unlimited

  const usage = await getOrgUsage(tenant.organizationId)
  if (usage[resource] >= limit) {
    throw NextResponse.json(
      { error: `${resource.charAt(0).toUpperCase() + resource.slice(1)} limit reached for your plan` },
      { status: 403 }
    )
  }
}
