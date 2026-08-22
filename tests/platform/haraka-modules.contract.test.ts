import { describe, it, expect } from 'vitest';
import { subscriptionUpdateSchema } from '@/lib/validations/subscription.schema';
import { packageSchema } from '@/lib/validations/package.schema';
import {
  FEATURE_KEYS,
  INCLUSION_KEYS,
  HARAKA_MODULES,
  HARAKA_MODULE_LABELS,
  type HarakaModule,
} from '@/types';

/** Minimal package that satisfies every required branch of packageSchema. */
function basePackage() {
  return {
    name: 'Test package',
    description: '',
    isActive: true,
    pricing: { monthlyPrice: 10, annualPrice: 100, currency: 'JOD', isCustom: false },
    trialDays: 0,
    sortOrder: 0,
    limits: {
      maxAssets: -1,
      maxUsers: -1,
      maxWarranties: -1,
      maxSpaces: -1,
      maxInventoryItems: -1,
    },
    features: Object.fromEntries(FEATURE_KEYS.map((k) => [k, true])),
    inclusions: Object.fromEntries(INCLUSION_KEYS.map((k) => [k, true])),
    allowances: {},
    addOnPrices: {},
  };
}

/**
 * HARAKA_MODULES is the single source of truth for which Haraka sub-modules
 * can be sold. Anything that validates or prices a module set has to stay in
 * step with it — when 'appointments' was added, a re-listed z.enum in
 * subscription.schema.ts kept rejecting it, so superadmin could tick the
 * module in the UI but never save it. These assertions fail loudly the next
 * time a copy drifts.
 */
describe('Haraka module registry stays in sync', () => {
  it('gives every module a label', () => {
    for (const m of HARAKA_MODULES) {
      expect(HARAKA_MODULE_LABELS[m], `missing label for '${m}'`).toBeTruthy();
    }
  });

  it('accepts every module in a subscription update', () => {
    const parsed = subscriptionUpdateSchema.safeParse({
      activeHarakaModules: HARAKA_MODULES,
    });
    expect(
      parsed.success ? null : parsed.error.flatten().fieldErrors,
    ).toBeNull();
  });

  it('accepts every module as a purchased add-on', () => {
    const parsed = subscriptionUpdateSchema.safeParse({
      activeAddOns: { extraHarakaModules: HARAKA_MODULES },
    });
    expect(
      parsed.success ? null : parsed.error.flatten().fieldErrors,
    ).toBeNull();
  });

  it('rejects a module that is not in the registry', () => {
    const parsed = subscriptionUpdateSchema.safeParse({
      activeHarakaModules: ['not_a_module'],
    });
    expect(parsed.success).toBe(false);
  });

  it('keeps a price slot for every non-pos module in a package', () => {
    // 'pos' is the base module the feature flag already gates, so it carries
    // no add-on price; every other module must have one. Checked on the parsed
    // OUTPUT, not on whether parsing succeeded — zod silently strips keys the
    // schema doesn't declare, so a missing slot would otherwise look fine.
    const priced = HARAKA_MODULES.filter((m) => m !== 'pos');
    const parsed = packageSchema.safeParse({
      ...basePackage(),
      addOnPrices: {
        harakaModules: Object.fromEntries(priced.map((m: HarakaModule) => [m, 5])),
      },
    });
    expect(parsed.success ? null : parsed.error.flatten()).toBeNull();
    if (!parsed.success) return;

    const kept = parsed.data.addOnPrices?.harakaModules ?? {};
    expect(Object.keys(kept).sort()).toEqual([...priced].sort());
  });
});
