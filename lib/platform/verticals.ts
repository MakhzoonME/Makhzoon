// Vertical registry — the branded surfaces that sit over the SAME shared
// engine (appointments, service catalog, customers, staff).
//
// Haraka (حركة) is the general commerce surface. It differs from any future
// vertical in feature key, permission namespace, URL segment, and
// vocabulary — not in data model.
//
// No DB access and no 'server-only' here: nav config, client guards, and
// server gates all import this.
import type { FeatureKey } from '@/types/package.types';
import type { UserPermissions } from '@/types/user-permissions.types';

export type Vertical = 'haraka';

export interface VerticalConfig {
  key: Vertical;
  /** Subscription feature flag that unlocks the vertical. */
  featureKey: FeatureKey;
  /** Permission namespace holding this vertical's operation grants. */
  permModule: keyof UserPermissions;
  /** URL segment under /[locale]/[orgSlug]/[space]/. */
  segment: string;
  /** Latin brand name shown in the sidebar. */
  label: string;
  /** Arabic brand name shown as the sidebar subtitle. */
  labelAr: string;
  /** Brand hex, mirrored by a --mod-<key> CSS variable in app/globals.css. */
  color: string;
}

export const VERTICALS: Record<Vertical, VerticalConfig> = {
  haraka: {
    key: 'haraka',
    featureKey: 'pos',
    permModule: 'haraka',
    segment: 'haraka',
    label: 'Haraka',
    labelAr: 'حركة',
    color: '#C2185B',
  },
};

export const VERTICAL_KEYS: Vertical[] = ['haraka'];

/**
 * Feature keys that unlock the shared appointment/catalog/customer engine.
 * A route gated on "any vertical" passes when the org holds any of these.
 */
export const VERTICAL_FEATURE_KEYS: FeatureKey[] = VERTICAL_KEYS.map(
  (k) => VERTICALS[k].featureKey,
);

/** Permission namespaces that may grant an operation on the shared engine. */
export const VERTICAL_PERM_MODULES: (keyof UserPermissions)[] = VERTICAL_KEYS.map(
  (k) => VERTICALS[k].permModule,
);

/** CSS custom property carrying the vertical's brand color. */
export function verticalColorVar(vertical: Vertical): string {
  return `var(--mod-${vertical})`;
}

/**
 * Which verticals is this org entitled to? Drives "does the shared engine
 * answer at all" checks and, on the client, which sidebar groups render.
 */
export function activeVerticals(
  features: Record<string, boolean> | null | undefined,
): Vertical[] {
  const f = features ?? {};
  return VERTICAL_KEYS.filter((k) => !!f[VERTICALS[k].featureKey]);
}

/** Resolve a URL segment back to its vertical, for layouts and shells. */
export function verticalFromSegment(segment: string): Vertical | null {
  return VERTICAL_KEYS.find((k) => VERTICALS[k].segment === segment) ?? null;
}
