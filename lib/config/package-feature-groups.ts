import type { FeatureKey } from '@/types';

/**
 * Groups FEATURE_KEYS the same way lib/nav/index.ts groups the sidebar, so
 * every admin surface that edits feature flags (PackageForm, the org
 * subscription page's "Feature Overrides") renders them consistently instead
 * of one flat unordered checkbox list. Shared here so the two don't drift.
 */

export const PLATFORM_FEATURES: FeatureKey[] = ['dashboard', 'support', 'auditLogs'];

export const USOOL_BASE_FEATURE: FeatureKey = 'assets';
export const USOOL_SUB_FEATURES: FeatureKey[] = ['warranties', 'maintenance', 'assetCheckouts', 'assetNotes'];

export const RASEED_BASE_FEATURE: FeatureKey = 'inventory';

export const HARAKA_BASE_FEATURE: FeatureKey = 'pos';

/**
 * Zeyara is its own base module, not a Haraka sub-module: a clinic package
 * typically ships `zeyara` ON and `pos` OFF. It is also OPT-IN when absent
 * (see OPT_IN_FEATURE_KEYS in types/package.types.ts), so it must be rendered
 * as its own toggle rather than folded into the Haraka card — otherwise a
 * superadmin has no way to sell a clinic the product.
 */
export const ZEYARA_BASE_FEATURE: FeatureKey = 'zeyara';

export const BANNA_FEATURE: FeatureKey = 'banna';

export const MODULE_COLORS = {
  usool: '#00695C',
  raseed: '#E65100',
  haraka: '#C2185B',
  zeyara: '#0F766E',
  banna: '#1565C0',
} as const;
