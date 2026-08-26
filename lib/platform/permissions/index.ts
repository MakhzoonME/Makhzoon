import { hasPermission as _hasPermission } from '@/lib/permissions'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { UserPermissions } from '@/types/user-permissions.types'
import { VERTICAL_PERM_MODULES } from '@/lib/platform/verticals'

export function hasPermission(
  tenant: TenantContext,
  module: keyof UserPermissions,
  operation: string
): boolean {
  return _hasPermission(tenant.user, module, operation)
}

/**
 * Permission check for the SHARED appointment/catalog/customer engine, which
 * more than one vertical reaches (see lib/platform/verticals.ts).
 *
 * Grants in either namespace satisfy the check: a Haraka org holds
 * `haraka.appointmentsCreate`, a clinic holds `zeyara.appointmentsCreate`, and
 * both mean the same operation on the same table. Operation keys are kept
 * identical across the two namespaces precisely so this needs no translation
 * table — only the human-facing labels differ.
 *
 * Additive by construction: an org without a Zeyara permission block simply
 * fails that half of the OR, so existing Haraka behaviour is unchanged.
 */
export function hasVerticalPermission(
  tenant: TenantContext,
  operation: string,
): boolean {
  return VERTICAL_PERM_MODULES.some((m) => _hasPermission(tenant.user, m, operation))
}

export { hasModuleAccess, hasPermByKey } from '@/lib/permissions'
