import { describe, it, expect, beforeEach } from 'vitest';
import {
  defaultFlagResolver,
  DEFAULT_COMPLIANCE_FLAGS,
  getCountryConfig,
  registerComplianceAdapter,
  resolveComplianceAdapter,
  listRegisteredAdapters,
  CANONICAL_INVOICE_SCHEMA_VERSION,
  COMPLIANCE_COLLECTIONS,
  type ComplianceAdapter,
} from '@/lib/compliance';
import { __clearAdapterRegistryForTests } from '@/lib/compliance/adapters/registry';

beforeEach(() => {
  __clearAdapterRegistryForTests();
  for (const k of Object.keys(DEFAULT_COMPLIANCE_FLAGS)) {
    delete process.env[k.replace(/\./g, '_').toUpperCase()];
  }
});

describe('compliance feature flags', () => {
  it('all flags default to false', () => {
    for (const flag of Object.keys(DEFAULT_COMPLIANCE_FLAGS)) {
      expect(defaultFlagResolver.isEnabled(flag as never)).toBe(false);
    }
  });

  it('respects a per-org override', () => {
    expect(
      defaultFlagResolver.isEnabled('compliance.enabled', { 'compliance.enabled': true }),
    ).toBe(true);
  });

  it('respects an env var override', () => {
    process.env.COMPLIANCE_ENABLED = 'true';
    expect(defaultFlagResolver.isEnabled('compliance.enabled')).toBe(true);
    process.env.COMPLIANCE_ENABLED = 'false';
    expect(defaultFlagResolver.isEnabled('compliance.enabled')).toBe(false);
  });
});

describe('country config', () => {
  it('lists Jordan, KSA, Egypt, UAE — all with compliance off', () => {
    for (const cc of ['JO', 'SA', 'EG', 'AE']) {
      const cfg = getCountryConfig(cc);
      expect(cfg, `country ${cc}`).not.toBeNull();
      expect(cfg!.complianceEnabled).toBe(false);
      expect(cfg!.submissionEnabled).toBe(false);
    }
  });

  it('returns null for unknown country', () => {
    expect(getCountryConfig('ZZ')).toBeNull();
  });
});

describe('adapter registry', () => {
  function fakeAdapter(country: string): ComplianceAdapter {
    return {
      capabilities: {
        countryCode: country,
        label: `Test adapter for ${country}`,
        acceptedSchemaVersions: [CANONICAL_INVOICE_SCHEMA_VERSION],
        qrLocal: false,
        requiresSignature: false,
      },
      validate: () => ({ ok: true, errors: [] }),
      transform: () => ({ countryCode: country, formatVersion: 'v1', payload: null }),
      submit: async () => ({
        externalReference: 'x',
        externalInvoiceNumber: null,
        acceptedAt: new Date().toISOString(),
        qrPayload: null,
        signature: null,
        raw: null,
      }),
      generateQRCode: () => ({ payload: '', encoding: 'OTHER' }),
      generateSignature: () => ({ algorithm: 'none', signature: '', certificateRef: null }),
    };
  }

  it('starts empty and registers adapters keyed by country', () => {
    expect(listRegisteredAdapters()).toHaveLength(0);
    registerComplianceAdapter(fakeAdapter('JO'));
    expect(listRegisteredAdapters()).toHaveLength(1);
    expect(resolveComplianceAdapter('jo')?.capabilities.countryCode).toBe('JO');
  });

  it('returns null for unregistered country', () => {
    expect(resolveComplianceAdapter('SA')).toBeNull();
  });
});

describe('storage collection names', () => {
  it('exposes a stable set of collection names', () => {
    expect(COMPLIANCE_COLLECTIONS.events).toBe('complianceEvents');
    expect(COMPLIANCE_COLLECTIONS.submissions).toBe('complianceSubmissions');
  });
});
