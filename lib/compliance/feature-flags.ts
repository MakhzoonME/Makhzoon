/**
 * Compliance feature flags. ALL flags default to false.
 *
 * Reading a flag never executes compliance work — it only gates whether
 * downstream code is allowed to run. The existing Fawtara module is the
 * one active compliance integration today; it remains wired through the
 * legacy `lib/modules/haraka/fawtara` path and is NOT affected by these
 * flags. Once the compliance abstraction layer here is adopted by the
 * POS, these flags become the activation switches.
 *
 * Flag resolution order:
 *  1. Per-org override (lives on `organizations/{orgId}.compliance.flags`)
 *  2. Process env var `COMPLIANCE_*`
 *  3. Hard-coded default below (always false)
 */

export type ComplianceFlagKey =
  | 'compliance.enabled'
  | 'compliance.qr.enabled'
  | 'compliance.submission.enabled'
  | 'compliance.signature.enabled'
  | 'compliance.queue.enabled'
  | 'compliance.audit.enabled'
  | `compliance.country.${string}.enabled`

export const DEFAULT_COMPLIANCE_FLAGS: Readonly<Record<string, boolean>> = Object.freeze({
  'compliance.enabled': false,
  'compliance.qr.enabled': false,
  'compliance.submission.enabled': false,
  'compliance.signature.enabled': false,
  'compliance.queue.enabled': false,
  'compliance.audit.enabled': false,
  // Country-specific flags (all off — adapters are inert until enabled).
  'compliance.country.JO.enabled': false,
  'compliance.country.SA.enabled': false,
  'compliance.country.EG.enabled': false,
  'compliance.country.AE.enabled': false,
  'compliance.country.PEPPOL.enabled': false,
})

export interface ComplianceFlagResolver {
  /** Returns true only when explicitly enabled. */
  isEnabled(flag: ComplianceFlagKey, orgFlags?: Record<string, boolean> | null): boolean
}

/**
 * Default resolver — checks per-org override first, then env, then default.
 * Pure: no side effects, no I/O.
 */
export const defaultFlagResolver: ComplianceFlagResolver = {
  isEnabled(flag, orgFlags) {
    if (orgFlags && Object.prototype.hasOwnProperty.call(orgFlags, flag)) {
      return orgFlags[flag] === true
    }
    const envKey = flag.replace(/\./g, '_').toUpperCase()
    const env = process.env[envKey]
    if (env === 'true' || env === '1') return true
    if (env === 'false' || env === '0') return false
    return DEFAULT_COMPLIANCE_FLAGS[flag] === true
  },
}
