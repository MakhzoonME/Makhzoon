import type { Package, Subscription } from '@/types'

export type LimitedResource =
  | 'assets'
  | 'users'
  | 'warranties'
  | 'spaces'
  | 'inventoryItems'

const UNLIMITED = -1

function base(included: number | null, legacy: number): number {
  // A null structured allowance means "not migrated to the new model yet" —
  // fall back to the legacy limits jsonb so existing orgs keep their caps.
  if (included === null || included === undefined) return legacy
  return included
}

/**
 * Resolve the effective cap for a resource:
 *   limit_overrides[k] ?? (package included allowance + purchased add-ons)
 * Returns -1 for unlimited. An explicit per-org override REPLACES the
 * included+add-on total (it's the absolute cap the superadmin set).
 */
export function effectiveResourceLimit(
  resource: LimitedResource,
  pkg: Package,
  sub: Subscription | null,
): number {
  const ov = sub?.limitOverrides ?? {}
  const addOns = sub?.activeAddOns
  const a = pkg.allowances
  const l = pkg.limits

  switch (resource) {
    case 'assets': {
      if (ov.usool != null) return ov.usool
      return base(a.usoolIncluded, l.maxAssets)
    }
    case 'inventoryItems': {
      if (ov.raseed != null) return ov.raseed
      return base(a.raseedIncluded, l.maxInventoryItems)
    }
    case 'users': {
      if (ov.users != null) return ov.users
      const b = base(a.usersIncluded, l.maxUsers)
      return b === UNLIMITED ? UNLIMITED : b + (addOns?.extraUsers ?? 0)
    }
    case 'spaces': {
      if (ov.spaces != null) return ov.spaces
      const b = base(a.spacesIncluded, l.maxSpaces)
      return b === UNLIMITED ? UNLIMITED : b + (addOns?.extraSpaces ?? 0)
    }
    case 'warranties':
      return l.maxWarranties
  }
}
