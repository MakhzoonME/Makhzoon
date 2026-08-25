'use client';
import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useTransferStore } from '@/store/transfer.store';
import type { AddOnKey } from '@/types';
import { getActiveAddOns } from '@/lib/platform/entitlements';
import { useSubscription } from './useSubscription';
import { usePackage } from '@/hooks/superadmin/usePackages';

/** Fresh, auto-refetching set of active independent add-ons (plan-included + purchased). */
export function useActiveAddOns(): Record<AddOnKey, boolean> {
  const { user } = useAuthStore();
  const { active, orgId: transferOrgId } = useTransferStore();

  const orgId =
    user?.role === 'super_admin'
      ? active && transferOrgId
        ? transferOrgId
        : null
      : (user?.organizationId ?? null);

  const { data: subscription } = useSubscription(orgId);
  const { data: pkg } = usePackage(subscription?.packageId ?? '');

  return useMemo(
    () => getActiveAddOns(subscription, pkg ?? null),
    [subscription, pkg],
  );
}
