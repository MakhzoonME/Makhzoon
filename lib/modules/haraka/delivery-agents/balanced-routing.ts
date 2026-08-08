import type { HarakaDeliveryAgent } from '@/types'

/**
 * Pick `count` active agents with the lowest current open-job load. Ties
 * broken by agent id for deterministic output. Pure function — no I/O — so
 * the load-balancing behavior is unit-testable without a database.
 */
export function selectBalancedAgents(
  agents: HarakaDeliveryAgent[],
  openJobCounts: Record<string, number>,
  count: number,
): HarakaDeliveryAgent[] {
  return agents
    .filter((a) => a.isActive)
    .slice()
    .sort((a, b) => {
      const loadDiff = (openJobCounts[a.id] ?? 0) - (openJobCounts[b.id] ?? 0)
      return loadDiff !== 0 ? loadDiff : a.id.localeCompare(b.id)
    })
    .slice(0, count)
}
