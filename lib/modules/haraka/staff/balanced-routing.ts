import type { HarakaStaff } from '@/types'

/**
 * Pick `count` active staff with the lowest current open-job load. Ties
 * broken by id for deterministic output. Pure function — no I/O — so the
 * load-balancing behavior is unit-testable without a database.
 */
export function selectBalancedStaff(
  staff: HarakaStaff[],
  openJobCounts: Record<string, number>,
  count: number,
): HarakaStaff[] {
  return staff
    .filter((s) => s.isActive)
    .slice()
    .sort((a, b) => {
      const loadDiff = (openJobCounts[a.id] ?? 0) - (openJobCounts[b.id] ?? 0)
      return loadDiff !== 0 ? loadDiff : a.id.localeCompare(b.id)
    })
    .slice(0, count)
}

/** @deprecated Renamed alongside `haraka_delivery_agents` → `haraka_staff`
 *  (migration 0067). Use `selectBalancedStaff`. */
export const selectBalancedAgents = selectBalancedStaff
