import { describe, it, expect } from 'vitest';
import {
  VERTICALS,
  VERTICAL_KEYS,
  VERTICAL_FEATURE_KEYS,
  VERTICAL_PERM_MODULES,
  activeVerticals,
  verticalFromSegment,
} from '@/lib/platform/verticals';
import { hasAnyVerticalPermission } from '@/lib/permissions';
import {
  FEATURE_KEYS,
  DEFAULT_ADMIN_PERMISSIONS,
} from '@/types';
import type { AuthUser } from '@/types/auth.types';

/** Staff user carrying exactly the permission blocks handed in. */
function staffWith(permissions: Record<string, Record<string, boolean>>): AuthUser {
  return { role: 'staff', permissions } as unknown as AuthUser;
}

/**
 * The vertical registry supports more than one branded surface sitting over
 * the SAME shared engine (appointments, service catalog, customers, staff).
 * Even with a single vertical registered today, these invariants keep the
 * registry internally consistent so a future vertical can be added safely:
 *
 *   1. Operation keys match across permission namespaces, so
 *      hasVerticalPermission() can resolve one op name against any of them
 *      without a translation table.
 *   2. Each vertical's key/segment/featureKey/color stay unique and in sync.
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
    expect(activeVerticals({})).toEqual([]);
    expect(activeVerticals(null)).toEqual([]);
  });
});

describe('shared-engine operations resolve in every vertical namespace', () => {
  // Ops the shared services gate on. If a key is renamed in one namespace but
  // not another, hasVerticalPermission() silently stops matching and the org
  // gets a 403 nothing in the UI explains.
  const SHARED_OPS = [
    'appointmentsView', 'appointmentsCreate', 'appointmentsUpdate',
    'appointmentsConfirm', 'appointmentsComplete', 'appointmentsCancel',
    'appointmentsMarkNoShow', 'appointmentsGenerateInvoice', 'appointmentsAddPayment', 'appointmentsAddProduct',
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
    });
    expect(hasAnyVerticalPermission(user, 'appointmentsCreate')).toBe(false);
  });
});
