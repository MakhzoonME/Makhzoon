import { describe, it, expect, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('server-only', () => ({}));

const getSubscriptionByOrg = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/subscriptions', () => ({ getSubscriptionByOrg }));

import { requireFeature, requireFeatureForOrg } from '@/lib/permissions/require-feature';
import type { TenantContext } from '@/lib/platform/tenancy/types';

function tenantWith(features: Record<string, boolean> | null): TenantContext {
  return {
    organizationId: 'org-1',
    userId: 'user-1',
    user: {} as TenantContext['user'],
    role: 'staff',
    permissions: null,
    subscription: features
      ? ({ features } as unknown as TenantContext['subscription'])
      : null,
  };
}

describe('requireFeature', () => {
  it('passes when the feature is enabled', () => {
    expect(() => requireFeature(tenantWith({ pos: true }), 'pos')).not.toThrow();
  });

  it('throws 403 when the feature is false', () => {
    try {
      requireFeature(tenantWith({ pos: false }), 'pos');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(NextResponse);
      expect((err as NextResponse).status).toBe(403);
    }
  });

  it('throws 403 when the feature key is missing (strict, matches useModuleGuard)', () => {
    expect(() => requireFeature(tenantWith({ assets: true }), 'pos')).toThrow();
  });

  it('throws 403 when the org has no subscription', () => {
    expect(() => requireFeature(tenantWith(null), 'pos')).toThrow();
  });
});

describe('requireFeatureForOrg', () => {
  it('passes when the subscription enables the feature', async () => {
    getSubscriptionByOrg.mockResolvedValueOnce({ features: { auditLogs: true } });
    await expect(requireFeatureForOrg('org-1', 'auditLogs')).resolves.toBeUndefined();
  });

  it('throws 403 when disabled or missing', async () => {
    getSubscriptionByOrg.mockResolvedValueOnce({ features: {} });
    await expect(requireFeatureForOrg('org-1', 'auditLogs')).rejects.toBeInstanceOf(NextResponse);
    getSubscriptionByOrg.mockResolvedValueOnce(null);
    await expect(requireFeatureForOrg('org-1', 'auditLogs')).rejects.toBeInstanceOf(NextResponse);
  });
});
