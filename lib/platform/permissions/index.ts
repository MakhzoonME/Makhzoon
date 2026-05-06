import { hasPermission as _hasPermission } from '@/lib/permissions'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { UserPermissions } from '@/types/user-permissions.types'

export function hasPermission(
  tenant: TenantContext,
  module: keyof UserPermissions,
  operation: string
): boolean {
  return _hasPermission(tenant.user, module, operation)
}

export { hasModuleAccess, hasPermByKey } from '@/lib/permissions'
