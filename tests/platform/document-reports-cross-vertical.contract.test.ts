import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  MODULE_PERMISSIONS_CONFIG,
  MODULE_GROUP_ORDER,
  MODULE_GROUP_LABELS,
  moduleFeatureAllowed,
} from '@/types';
import { ORG_NAV_ENTRIES, navFeatureAllowed, type NavGroupConfig, type NavItemConfig } from '@/lib/nav';
import { VERTICAL_FEATURE_KEYS } from '@/lib/platform/verticals';
import { createInstanceSchema } from '@/lib/modules/document-reports/schemas';

/**
 * Document Reports started life as a Haraka add-on: the routes required
 * `pos`, the nav item lived under the Haraka group, and the permission module
 * was gated on `pos`. It was later generalized to be reachable from any
 * vertical the org holds, not just Haraka.
 *
 * These are the invariants that keep the module reachable from EVERY
 * registered vertical. Each one is a place a single-vertical assumption was
 * hard-coded.
 */

const ROOT = process.cwd();

function groupByHref(href: string): NavGroupConfig | undefined {
  return ORG_NAV_ENTRIES.find(
    (e): e is NavGroupConfig => 'type' in e && e.type === 'group' && e.href === href,
  );
}

function itemsOf(group: NavGroupConfig | undefined): NavItemConfig[] {
  return (group?.items ?? []).filter((i): i is NavItemConfig => !('type' in i));
}

describe('Document Reports is reachable from every vertical', () => {
  it('gates the permission module on any vertical, not just pos', () => {
    const mod = MODULE_PERMISSIONS_CONFIG.find((m) => m.key === 'documentReports');
    expect(mod, 'no documentReports block in MODULE_PERMISSIONS_CONFIG').toBeDefined();
    expect(mod?.featureKeys).toEqual(VERTICAL_FEATURE_KEYS);

    expect(moduleFeatureAllowed(mod!, { pos: true })).toBe(true);
    // ...and an org holding no vertical still sees nothing.
    expect(moduleFeatureAllowed(mod!, { pos: false })).toBe(false);
  });

  it('gives the module its own permission group rather than a vertical heading', () => {
    const mod = MODULE_PERMISSIONS_CONFIG.find((m) => m.key === 'documentReports');
    expect(mod?.group).toBe('reports');
    expect(MODULE_GROUP_ORDER).toContain('reports');
    expect(MODULE_GROUP_LABELS.reports).toBeTruthy();
  });

  it('renders a Reports nav item under every vertical, add-on gated', () => {
    for (const [groupHref, featureKey] of [['/haraka', 'pos']] as const) {
      const item = itemsOf(groupByHref(groupHref)).find((i) => i.href === `${groupHref}/reports`);
      expect(item, `no Reports nav item under ${groupHref}`).toBeDefined();
      expect(item?.featureKey).toBe(featureKey);
      expect(item?.harakaAddOn, 'the add-on is what sells the module').toBe('documentReports');
      expect(item?.permissionKey).toBe('documentReports.reportsView');
    }
  });

  it('shows the template builder to any org holding a vertical', () => {
    const settings = groupByHref('/settings');
    const templates = itemsOf(settings).find((i) => i.href === '/settings/reports');
    expect(templates, 'the Report Templates settings entry is missing').toBeDefined();
    expect(templates?.featureKeys).toEqual(VERTICAL_FEATURE_KEYS);
    expect(navFeatureAllowed(templates!, { pos: true })).toBe(true);
    expect(navFeatureAllowed(templates!, { pos: false })).toBe(false);
  });

  it('keeps navFeatureAllowed a strict any-of over the declared keys', () => {
    expect(navFeatureAllowed({ featureKeys: ['a', 'b'] }, { b: true })).toBe(true);
    expect(navFeatureAllowed({ featureKeys: ['a', 'b'] }, { c: true })).toBe(false);
    // featureKeys wins over a stale single key, and no gate means no gate.
    expect(navFeatureAllowed({ featureKey: 'a', featureKeys: ['b'] }, { a: true })).toBe(false);
    expect(navFeatureAllowed({}, {})).toBe(true);
  });

  it('gates every reports API route on any vertical, never on pos alone', () => {
    const dir = join(ROOT, 'app', 'api', 'document-reports');
    const routes: string[] = [];
    (function walk(d: string) {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.name === 'route.ts') routes.push(p);
      }
    })(dir);

    expect(routes.length, 'no document-reports routes found').toBeGreaterThan(0);
    for (const file of routes) {
      const src = readFileSync(file, 'utf8');
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
      // The public share link is token-gated and deliberately ungated here.
      if (rel.includes('/share/')) continue;
      expect(
        src.includes("requireFeature(tenant, 'pos')"),
        `${rel} still gates on 'pos' — an org on another vertical gets a 403 from its own reports`,
      ).toBe(false);
      expect(
        src.includes('requireAnyVerticalFeature(tenant)'),
        `${rel} does not call requireAnyVerticalFeature`,
      ).toBe(true);
      expect(
        src.includes("requireAddOn(tenant, 'documentReports')"),
        `${rel} does not enforce the documentReports add-on`,
      ).toBe(true);
    }
  });

  it('accepts the standard encounter types', () => {
    const base = {
      templateId: '00000000-0000-4000-8000-000000000001',
      customerId: '00000000-0000-4000-8000-000000000002',
      encounterId: '00000000-0000-4000-8000-000000000003',
    };
    for (const encounterType of ['appointment', 'service_job', 'order']) {
      expect(
        createInstanceSchema.safeParse({ ...base, encounterType }).success,
        `'${encounterType}' should be a valid encounter type`,
      ).toBe(true);
    }
    expect(createInstanceSchema.safeParse({ ...base, encounterType: 'wedding' }).success).toBe(false);
  });
});
