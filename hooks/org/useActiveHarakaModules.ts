'use client';
import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useTransferStore } from '@/store/transfer.store';
import type { HarakaModule } from '@/types';
import { useSubscription } from './useSubscription';

/** Fresh, auto-refetching set of active Haraka sub-modules (plan-included + purchased add-ons). */
export function useActiveHarakaModules() {
  const { user } = useAuthStore();
  const { active, orgId: transferOrgId } = useTransferStore();

  const orgId =
    user?.role === 'super_admin'
      ? active && transferOrgId
        ? transferOrgId
        : null
      : (user?.organizationId ?? null);

  const { data: subscription } = useSubscription(orgId);

  return useMemo((): HarakaModule[] => {
    if (!subscription) return [];
    return [
      ...(subscription.activeHarakaModules ?? []),
      ...(subscription.activeAddOns?.extraHarakaModules ?? []),
    ];
  }, [subscription]);
}
