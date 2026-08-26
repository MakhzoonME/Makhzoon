'use client';

// Supplies the active vertical (Haraka or Zeyara) to shared page bodies, so a
// single component can serve both surfaces instead of being forked per brand.
//
// Page bodies read featureKey / permModule / basePath / colorVar from here
// rather than hard-coding 'pos', 'haraka', `.../haraka`, and
// var(--mod-haraka). See docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §2.4.
import { createContext, useContext, useMemo } from 'react';
import { useParams } from 'next/navigation';
import type { FeatureKey } from '@/types/package.types';
import type { UserPermissions } from '@/types/user-permissions.types';
import { VERTICALS, verticalColorVar, type Vertical } from '@/lib/platform/verticals';

export interface VerticalContextValue {
  vertical: Vertical;
  featureKey: FeatureKey;
  permModule: keyof UserPermissions;
  /** Brand hex, e.g. '#0F766E'. */
  color: string;
  /** CSS custom property reference, e.g. 'var(--mod-zeyara)'. */
  colorVar: string;
  /** Tenant-scoped route root, e.g. '/en/acme/default/zeyara'. */
  basePath: string;
  label: string;
  labelAr: string;
  /**
   * URL segment for the pos_customers directory. The same rows are
   * "customers" in Haraka and "patients" in Zeyara, so shared pages build
   * links from this rather than assuming either word.
   */
  customersSegment: string;
  /** URL segment for the haraka_staff directory: staff vs providers. */
  staffSegment: string;
  /** Sidebar label key for this vertical's root, for breadcrumbs. */
  navLabelKey: 'nav.pos' | 'nav.zeyara';
}

/** Per-vertical vocabulary for entities that are shared but named differently. */
const SEGMENTS: Record<Vertical, Pick<VerticalContextValue, 'customersSegment' | 'staffSegment' | 'navLabelKey'>> = {
  haraka: { customersSegment: 'customers', staffSegment: 'staff', navLabelKey: 'nav.pos' },
  zeyara: { customersSegment: 'patients', staffSegment: 'providers', navLabelKey: 'nav.zeyara' },
};

const VerticalCtx = createContext<VerticalContextValue | null>(null);

export function VerticalProvider({
  vertical,
  children,
}: {
  vertical: Vertical;
  children: React.ReactNode;
}) {
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();

  const value = useMemo<VerticalContextValue>(() => {
    const cfg = VERTICALS[vertical];
    const locale = (params?.locale as string) ?? 'en';
    const orgSlug = (params?.orgSlug as string) ?? '';
    const space = (params?.space as string) ?? 'default';
    return {
      vertical,
      featureKey: cfg.featureKey,
      permModule: cfg.permModule,
      color: cfg.color,
      colorVar: verticalColorVar(vertical),
      basePath: `/${locale}/${orgSlug}/${space}/${cfg.segment}`,
      label: cfg.label,
      labelAr: cfg.labelAr,
      ...SEGMENTS[vertical],
    };
  }, [vertical, params?.locale, params?.orgSlug, params?.space]);

  return <VerticalCtx.Provider value={value}>{children}</VerticalCtx.Provider>;
}

/**
 * Active vertical for the surrounding route.
 *
 * Defaults to Haraka when no provider is mounted so that any Haraka page not
 * yet wrapped keeps its previous behaviour verbatim — the migration to shared
 * bodies can proceed page by page without a flag day.
 */
export function useVertical(): VerticalContextValue {
  const ctx = useContext(VerticalCtx);
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();

  return useMemo<VerticalContextValue>(() => {
    if (ctx) return ctx;
    const cfg = VERTICALS.haraka;
    const locale = (params?.locale as string) ?? 'en';
    const orgSlug = (params?.orgSlug as string) ?? '';
    const space = (params?.space as string) ?? 'default';
    return {
      vertical: 'haraka',
      featureKey: cfg.featureKey,
      permModule: cfg.permModule,
      color: cfg.color,
      colorVar: verticalColorVar('haraka'),
      basePath: `/${locale}/${orgSlug}/${space}/${cfg.segment}`,
      label: cfg.label,
      labelAr: cfg.labelAr,
      ...SEGMENTS.haraka,
    };
  }, [ctx, params?.locale, params?.orgSlug, params?.space]);
}
