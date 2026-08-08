import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { computeInvoice } from '@/lib/billing/compute-invoice';
import { EMPTY_ADD_ONS } from '@/types';
import type { Package, Subscription } from '@/types';

function pkg(overrides: Partial<Package> = {}): Package {
  return {
    id: 'pkg-1',
    name: 'Growth',
    description: '',
    isActive: true,
    pricing: { monthlyPrice: 50, annualPrice: null, currency: 'JOD', isCustom: false },
    trialDays: 0,
    sortOrder: 0,
    limits: { maxAssets: -1, maxUsers: -1, maxWarranties: -1, maxSpaces: -1, maxInventoryItems: -1 },
    features: {} as Package['features'],
    inclusions: {} as Package['inclusions'],
    allowances: {
      usoolIncluded: null,
      raseedIncluded: null,
      purchasesRequestsIncluded: false,
      harakaIncludedModuleSlots: 0,
      deliveryAgentsIncluded: false,
      warrantyCertsIncluded: false,
      customizationIncluded: false,
      spacesIncluded: null,
      usersIncluded: null,
      reportsAvailable: false,
      vehicleIntakeIncluded: false,
      loyaltyIncluded: false,
    },
    addOnPrices: {
      deliveryAgents: 10,
      warrantyCerts: 5,
      customization: 15,
      vehicleIntake: 20,
      loyalty: 12,
    },
    isCustom: false,
    createdAt: new Date(),
    createdBy: 'test',
    updatedAt: new Date(),
    updatedBy: 'test',
    ...overrides,
  };
}

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    organizationId: 'org-1',
    packageId: 'pkg-1',
    features: {},
    notes: null,
    packageDetails: {},
    startDate: new Date(),
    endDate: new Date(),
    status: 'ACTIVE',
    activeHarakaModules: [],
    activeAddOns: { ...EMPTY_ADD_ONS },
    limitOverrides: {},
    foundingCohort: null,
    billingAnchorDay: 1,
    graceStartedAt: null,
    cancelledAt: null,
    cancelReason: null,
    pendingPackageId: null,
    pendingChangeEffectiveAt: null,
    createdAt: new Date(),
    createdBy: 'test',
    updatedAt: new Date(),
    updatedBy: 'test',
    ...overrides,
  };
}

describe('computeInvoice — vehicleIntake / loyalty add-ons', () => {
  it('adds a vehicleIntake line item when the add-on is active and not plan-included', () => {
    const s = sub({ activeAddOns: { ...EMPTY_ADD_ONS, vehicleIntake: true } });
    const invoice = computeInvoice(s, pkg());
    const line = invoice.lineItems.find((l) => l.description === 'Vehicle intake');
    expect(line).toBeDefined();
    expect(line!.total).toBe(20);
  });

  it('adds a loyalty line item when the add-on is active and not plan-included', () => {
    const s = sub({ activeAddOns: { ...EMPTY_ADD_ONS, loyalty: true } });
    const invoice = computeInvoice(s, pkg());
    const line = invoice.lineItems.find((l) => l.description === 'Loyalty program');
    expect(line).toBeDefined();
    expect(line!.total).toBe(12);
  });

  it('does not charge for vehicleIntake when the plan already includes it', () => {
    const s = sub({ activeAddOns: { ...EMPTY_ADD_ONS, vehicleIntake: true } });
    const p = pkg({ allowances: { ...pkg().allowances, vehicleIntakeIncluded: true } });
    const invoice = computeInvoice(s, p);
    expect(invoice.lineItems.find((l) => l.description === 'Vehicle intake')).toBeUndefined();
  });

  it('does not add either line item when neither add-on is active', () => {
    const invoice = computeInvoice(sub(), pkg());
    expect(invoice.lineItems.find((l) => l.description === 'Vehicle intake')).toBeUndefined();
    expect(invoice.lineItems.find((l) => l.description === 'Loyalty program')).toBeUndefined();
  });

  it('includes both add-ons in the subtotal alongside the base plan price', () => {
    const s = sub({ activeAddOns: { ...EMPTY_ADD_ONS, vehicleIntake: true, loyalty: true } });
    const invoice = computeInvoice(s, pkg());
    expect(invoice.subtotal).toBe(50 + 20 + 12);
    expect(invoice.total).toBe(82);
  });
});
