'use client';
import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useTransferStore } from '@/store/transfer.store';
import { useSubscription } from './useSubscription';

export function useSubscriptionFeatures() {
  const { user } = useAuthStore();
  const { active, orgId: transferOrgId } = useTransferStore();

  // Superadmin in transfer mode uses the transfer org; otherwise use the user's org.
  const orgId =
    user?.role === 'super_admin'
      ? active && transferOrgId
        ? transferOrgId
        : null
      : (user?.organizationId ?? null);

  const { data: subscription } = useSubscription(orgId);

  return useMemo((): Record<string, boolean> => {
    return subscription?.features ?? {};
  }, [subscription]);
}
