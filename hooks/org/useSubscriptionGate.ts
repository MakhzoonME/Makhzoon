'use client';
import { useAuthStore } from '@/store/auth.store';
import { useTransferStore } from '@/store/transfer.store';
import { useSubscription } from './useSubscription';
import { formatDate } from '@/lib/utils/date';

const DAYS_UNTIL_SUSPENSION = 30;
const SUPER_ADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export interface SubscriptionGate {
  /** True when the org is expired or suspended and the current user is not a superadmin */
  restricted: boolean;
  /** Tooltip message to show on disabled actions */
  tooltip: string | null;
}

export function useSubscriptionGate(): SubscriptionGate {
  const { user } = useAuthStore();
  const { active, orgId: transferOrgId } = useTransferStore();

  const isSuperAdmin = user ? SUPER_ADMIN_ROLES.has(user.role) : false;

  const orgId = isSuperAdmin
    ? active && transferOrgId
      ? transferOrgId
      : null
    : (user?.organizationId ?? null);

  const { data: sub } = useSubscription(orgId);

  if (!sub || isSuperAdmin) {
    return { restricted: false, tooltip: null };
  }

  if (sub.status === 'SUSPENDED') {
    return {
      restricted: true,
      tooltip: 'Your subscription is suspended. Please contact support to restore access.',
    };
  }

  if (sub.status === 'EXPIRED') {
    const suspensionDate = new Date(sub.endDate);
    suspensionDate.setDate(suspensionDate.getDate() + DAYS_UNTIL_SUSPENSION);
    return {
      restricted: true,
      tooltip: `Your subscription has expired. It will be suspended on ${formatDate(suspensionDate)}. Please contact your administrator to renew.`,
    };
  }

  return { restricted: false, tooltip: null };
}
