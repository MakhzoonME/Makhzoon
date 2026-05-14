/**
 * Adapter registry. Empty by default — country adapters register themselves
 * by importing this module and calling `registerComplianceAdapter`.
 *
 * No adapter is registered at boot. Activation is a two-step process:
 *   1. Import the adapter module (so its registration side-effect fires).
 *   2. Enable the corresponding feature flag (`compliance.country.JO.enabled`).
 *
 * Resolution returns `null` when no adapter is registered for a country, so
 * callers can fail soft and the POS keeps working.
 */

import type { ComplianceAdapter } from '../contracts/adapter'

const registry = new Map<string, ComplianceAdapter>()

export function registerComplianceAdapter(adapter: ComplianceAdapter): void {
  const cc = adapter.capabilities.countryCode.toUpperCase()
  if (registry.has(cc)) {
    console.warn(`[compliance] adapter for ${cc} already registered — overwriting`)
  }
  registry.set(cc, adapter)
}

export function resolveComplianceAdapter(countryCode: string): ComplianceAdapter | null {
  return registry.get(countryCode.toUpperCase()) ?? null
}

export function listRegisteredAdapters(): ComplianceAdapter[] {
  return Array.from(registry.values())
}

/** Test-only — clears the registry between unit tests. */
export function __clearAdapterRegistryForTests(): void {
  registry.clear()
}
