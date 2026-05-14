/**
 * Per-country compliance configuration metadata. Used by ops dashboards and
 * activation checks. The presence of a country here does NOT imply an active
 * adapter — adapters register themselves separately (see adapters/registry).
 *
 * Every flag here defaults off. A tenant only sees compliance behavior once
 * BOTH the country config is marked complianceEnabled=true AND the feature
 * flag `compliance.country.<CC>.enabled` is true.
 */

export interface CountryComplianceConfig {
  /** ISO 3166-1 alpha-2. */
  country: string
  label: string
  currency: string
  defaultVatRate: number
  complianceEnabled: boolean
  qrEnabled: boolean
  submissionEnabled: boolean
  signatureRequired: boolean
  /** Free-form notes for ops (links to tax authority docs, etc). */
  notes: string | null
}

export const COUNTRY_CONFIGS: Readonly<Record<string, CountryComplianceConfig>> = Object.freeze({
  JO: {
    country: 'JO',
    label: 'Jordan (JoFotara/Fawtara)',
    currency: 'JOD',
    defaultVatRate: 0.16,
    complianceEnabled: false,
    qrEnabled: false,
    submissionEnabled: false,
    signatureRequired: false,
    notes: 'Existing Fawtara integration lives in lib/modules/haraka/fawtara — migrate to adapter pattern when this turns on.',
  },
  SA: {
    country: 'SA',
    label: 'Saudi Arabia (ZATCA)',
    currency: 'SAR',
    defaultVatRate: 0.15,
    complianceEnabled: false,
    qrEnabled: false,
    submissionEnabled: false,
    signatureRequired: true,
    notes: 'Phase 2 requires CSID + XML signature. Plan: wire SignatureProvider before enabling.',
  },
  EG: {
    country: 'EG',
    label: 'Egypt (ETA)',
    currency: 'EGP',
    defaultVatRate: 0.14,
    complianceEnabled: false,
    qrEnabled: false,
    submissionEnabled: false,
    signatureRequired: true,
    notes: null,
  },
  AE: {
    country: 'AE',
    label: 'UAE (e-invoicing)',
    currency: 'AED',
    defaultVatRate: 0.05,
    complianceEnabled: false,
    qrEnabled: false,
    submissionEnabled: false,
    signatureRequired: false,
    notes: 'Spec still evolving — placeholder only.',
  },
})

export function getCountryConfig(countryCode: string): CountryComplianceConfig | null {
  return COUNTRY_CONFIGS[countryCode.toUpperCase()] ?? null
}
