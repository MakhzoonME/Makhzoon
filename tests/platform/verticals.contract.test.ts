import { describe, it, expect } from 'vitest';
import {
  VERTICALS,
  VERTICAL_KEYS,
  VERTICAL_FEATURE_KEYS,
  VERTICAL_PERM_MODULES,
  activeVerticals,
  verticalFromSegment,
} from '@/lib/platform/verticals';
import { hasPermission, hasAnyVerticalPermission } from '@/lib/permissions';
import {
  FEATURE_KEYS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  MODULE_PERMISSIONS_CONFIG,
  MODULE_GROUP_ORDER,
  MODULE_GROUP_LABELS,
  OPT_IN_FEATURE_KEYS,
  defaultFeatureWhenAbsent,
} from '@/types';
import { ORG_NAV_ENTRIES } from '@/lib/nav';
import type { AuthUser } from '@/types/auth.types';

/** Staff user carrying exactly the permission blocks handed in. */
function staffWith(permissions: Record<string, Record<string, boolean>>): AuthUser {
  return { role: 'staff', permissions } as unknown as AuthUser;
}

/**
 * Zeyara rides the SAME engine as Haraka rather than forking it
 * (docs/plans/2026-08-26-zeyara-clinic-vertical-design.md). Two properties hold
 * that design together, and both are easy to break by accident:
 *
 *   1. Operation keys match across the two permission namespaces, so
 *      hasVerticalPermission() can resolve one op name against either without
 *      a translation table.
 *   2. The vertical layer is ADDITIVE — a Haraka-only org must be unaffected.
 */
describe('vertical registry stays in sync', () => {
  it('registers every vertical under its own key', () => {
    for (const k of VERTICAL_KEYS) {
      expect(VERTICALS[k].key, `'${k}' is filed under the wrong key`).toBe(k);
    }
  });

  it('uses a real FeatureKey for every vertical', () => {
    for (const k of VERTICAL_KEYS) {
      expect(FEATURE_KEYS, `'${k}' feature key is not in FEATURE_KEYS`).toContain(
        VERTICALS[k].featureKey,
      );
    }
  });

  it('gives every vertical a distinct segment, feature key, and brand color', () => {
    const segments = VERTICAL_KEYS.map((k) => VERTICALS[k].segment);
    const colors = VERTICAL_KEYS.map((k) => VERTICALS[k].color);
    expect(new Set(segments).size).toBe(segments.length);
    expect(new Set(VERTICAL_FEATURE_KEYS).size).toBe(VERTICAL_FEATURE_KEYS.length);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('round-trips a segment back to its vertical', () => {
    for (const k of VERTICAL_KEYS) {
      expect(verticalFromSegment(VERTICALS[k].segment)).toBe(k);
    }
    expect(verticalFromSegment('raseed')).toBeNull();
  });

  it('resolves active verticals from subscription features', () => {
    expect(activeVerticals({ pos: true })).toEqual(['haraka']);
    expect(activeVerticals({ zeyara: true })).toEqual(['zeyara']);
    expect(activeVerticals({ pos: true, zeyara: true })).toEqual(['haraka', 'zeyara']);
    expect(activeVerticals({})).toEqual([]);
    expect(activeVerticals(null)).toEqual([]);
  });
});

describe('shared-engine operations resolve in either namespace', () => {
  // Ops the shared services gate on. If a key is renamed in one namespace but
  // not the other, hasVerticalPermission() silently stops matching and the
  // clinic gets a 403 nothing in the UI explains.
  const SHARED_OPS = [
    'appointmentsView', 'appointmentsCreate', 'appointmentsUpdate',
    'appointmentsConfirm', 'appointmentsComplete', 'appointmentsCancel',
    'appointmentsMarkNoShow', 'appointmentsGenerateInvoice', 'appointmentsAddPayment',
    'customersView', 'customersCreate', 'customersUpdate', 'customersDelete',
    'customersExport', 'customersHistoryView',
    'customerFieldsView', 'customerFieldsCreate', 'customerFieldsUpdate', 'customerFieldsDelete',
    'serviceCatalogView', 'serviceCatalogCreate', 'serviceCatalogUpdate', 'serviceCatalogDelete',
    'staffManage', 'staffAvailabilityManage',
    'analyticsView',
  ];

  it('declares every shared op in all vertical namespaces', () => {
    for (const mod of VERTICAL_PERM_MODULES) {
      const block = DEFAULT_ADMIN_PERMISSIONS[mod] as unknown as Record<string, boolean>;
      for (const op of SHARED_OPS) {
        expect(block[op], `'${String(mod)}.${op}' is missing`).toBe(true);
      }
    }
  });

  it('matches a grant held in only ONE namespace', () => {
    for (const mod of VERTICAL_PERM_MODULES) {
      const user = staffWith({ [mod as string]: { appointmentsCreate: true } });
      expect(
        hasAnyVerticalPermission(user, 'appointmentsCreate'),
        `a grant on '${String(mod)}' alone should satisfy the shared gate`,
      ).toBe(true);
    }
  });

  it('does not invent access when no namespace grants the op', () => {
    const user = staffWith({
      haraka: { appointmentsView: true },
      zeyara: { appointmentsView: true },
    });
    expect(hasAnyVerticalPermission(user, 'appointmentsCreate')).toBe(false);
  });
});

describe('the Zeyara vertical is additive', () => {
  it('leaves staff defaults closed in both namespaces', () => {
    // Staff start with nothing in either vertical; the clinic namespace must
    // not have quietly opened a door on the commerce one.
    const haraka = DEFAULT_STAFF_PERMISSIONS.haraka as unknown as Record<string, boolean>;
    const zeyara = DEFAULT_STAFF_PERMISSIONS.zeyara as unknown as Record<string, boolean>;
    expect(Object.values(haraka).every((v) => v === false)).toBe(true);
    expect(Object.values(zeyara).every((v) => v === false)).toBe(true);
  });

  it('does not let a Zeyara grant reach a Haraka-exclusive operation', () => {
    // Orders/register/warranty certs are commerce-only. A clinic user holding
    // the whole Zeyara namespace must still be refused them.
    const clinicUser = staffWith({
      zeyara: DEFAULT_ADMIN_PERMISSIONS.zeyara as unknown as Record<string, boolean>,
    });
    for (const op of ['ordersCreate', 'registerOpen', 'warrantyCertsView', 'transactionsRefund']) {
      expect(
        hasPermission(clinicUser, 'haraka', op),
        `'${op}' is Haraka-exclusive and must not be reachable from Zeyara`,
      ).toBe(false);
    }
  });

  it('gates every Zeyara nav entry on the zeyara feature key', () => {
    const group = ORG_NAV_ENTRIES.find(
      (e) => 'type' in e && e.type === 'group' && e.href === '/zeyara',
    );
    expect(group, 'the Zeyara nav group is missing').toBeDefined();
    if (!group || !('items' in group)) return;

    expect(group.featureKey).toBe('zeyara');
    // Cross-vertical modules keep their OWN permission namespace on both
    // surfaces — Document Reports is one engine sold to retailers and clinics
    // alike, so /zeyara/reports is granted through 'documentReports.*', not a
    // duplicated 'zeyara.reports*'. Everything genuinely owned by the vertical
    // must still live in the zeyara namespace.
    const CROSS_VERTICAL_PERM_MODULES = ['documentReports'];
    for (const item of group.items) {
      if ('type' in item) continue; // section header
      expect(item.featureKey, `'${item.href}' is not gated on the zeyara feature`).toBe('zeyara');
      const permModule = item.permissionKey?.split('.')[0];
      expect(
        permModule === 'zeyara' || CROSS_VERTICAL_PERM_MODULES.includes(permModule ?? ''),
        `'${item.href}' uses permission key '${item.permissionKey}' outside the zeyara namespace`,
      ).toBe(true);
      // Zeyara is its own entitlement — it must never additionally require a
      // Haraka sub-module the clinic never bought (design doc §3).
      expect(
        item.harakaModule,
        `'${item.href}' must not require a Haraka sub-module`,
      ).toBeUndefined();
    }
  });

  it('defaults the zeyara feature OFF when absent from a stored feature map', () => {
    // The superadmin subscription form hydrates missing FEATURE_KEYS from this
    // helper. If zeyara ever defaults ON, opening and saving ANY existing org's
    // subscription would hand a retail business the clinic sidebar.
    expect(OPT_IN_FEATURE_KEYS).toContain('zeyara');
    expect(defaultFeatureWhenAbsent('zeyara')).toBe(false);
    // ...while established keys keep the existing default-on convention.
    expect(defaultFeatureWhenAbsent('pos')).toBe(true);
    expect(defaultFeatureWhenAbsent('assets')).toBe(true);
  });

  it('exposes Zeyara as its own group in the permissions editor', () => {
    const mod = MODULE_PERMISSIONS_CONFIG.find((m) => m.key === 'zeyara');
    expect(mod, 'no zeyara block in MODULE_PERMISSIONS_CONFIG').toBeDefined();
    expect(mod?.featureKey).toBe('zeyara');
    expect(mod?.group).toBe('zeyara');
    expect(MODULE_GROUP_ORDER).toContain('zeyara');
    expect(MODULE_GROUP_LABELS.zeyara).toBeTruthy();
  });

  it('declares every editor operation on the ZeyaraPermissions type', () => {
    const mod = MODULE_PERMISSIONS_CONFIG.find((m) => m.key === 'zeyara');
    const block = DEFAULT_ADMIN_PERMISSIONS.zeyara as unknown as Record<string, boolean>;
    for (const op of mod?.operations ?? []) {
      expect(block[op.key], `editor lists '${op.key}' but the type has no such key`).toBe(true);
    }
  });
});
