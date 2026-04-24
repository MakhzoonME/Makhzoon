'use client';
import { useAuthStore } from '@/store/auth.store';
import { useTransferStore } from '@/store/transfer.store';
import { useSubscription } from '@/hooks/useSubscription';
import { daysUntil } from '@/lib/utils/date';
import { formatDate } from '@/lib/utils/date';
import { AlertTriangle, XCircle } from 'lucide-react';

export function ExpiryWarningBanner() {
  const { user } = useAuthStore();
  const { active, orgId: transferOrgId } = useTransferStore();

  const orgId =
    user?.role === 'super_admin'
      ? active && transferOrgId
        ? transferOrgId
        : null
      : (user?.organizationId ?? null);

  const { data: sub } = useSubscription(orgId);

  if (!sub) return null;

  const days = daysUntil(new Date(sub.endDate));

  if (sub.status === 'SUSPENDED') {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-800">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        Your subscription is suspended. Please contact support.
      </div>
    );
  }

  if (days <= 0) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-800">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        Your subscription has expired. Please renew to continue using the app.
      </div>
    );
  }

  if (days <= 14) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        Your subscription expires in <span className="font-semibold mx-1">{days} day{days !== 1 ? 's' : ''}</span>
        on {formatDate(new Date(sub.endDate))}. Please contact your administrator to renew.
      </div>
    );
  }

  return null;
}
