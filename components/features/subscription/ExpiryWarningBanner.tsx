'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useTransferStore } from '@/store/transfer.store';
import { useSubscription } from '@/hooks/org';
import { daysUntil } from '@/lib/utils/date';
import { formatDate } from '@/lib/utils/date';

const DAYS_UNTIL_SUSPENSION = 30;

function AlertTriangleSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      <path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function XCircleSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ExpiryWarningBanner() {
  const { user } = useAuthStore();
  const { active, orgId: transferOrgId } = useTransferStore();

  const orgId =
    user?.role === 'super_admin'
      ? active && transferOrgId
        ? transferOrgId
        : null
      : (user?.organizationId ?? null);

  const { data: sub, refetch } = useSubscription(orgId);

  // Auto-suspend: if EXPIRED for ≥30 days, upgrade status to SUSPENDED server-side
  useEffect(() => {
    if (!sub || !orgId || sub.status !== 'EXPIRED') return;
    const daysPastExpiry = -daysUntil(new Date(sub.endDate));
    if (daysPastExpiry >= DAYS_UNTIL_SUSPENSION) {
      fetch(`/api/organizations/${orgId}/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SUSPENDED', endDate: new Date(sub.endDate).toISOString() }),
      })
        .then(() => refetch())
        .catch(() => {});
    }
  }, [sub, orgId, refetch]);

  if (!sub) return null;

  const days = daysUntil(new Date(sub.endDate));

  if (sub.status === 'SUSPENDED') {
    return (
      <div className="bg-[var(--red-100)] border-b border-[var(--red-100)] px-4 py-2 flex items-center gap-2 text-sm text-[var(--red-700)]">
        <XCircleSVG />
        Your subscription is suspended. Please contact support.
      </div>
    );
  }

  if (days <= 0) {
    const suspensionDate = new Date(sub.endDate);
    suspensionDate.setDate(suspensionDate.getDate() + DAYS_UNTIL_SUSPENSION);
    return (
      <div className="bg-[var(--red-100)] border-b border-[var(--red-100)] px-4 py-2 flex items-center gap-2 text-sm text-[var(--red-700)]">
        <XCircleSVG />
        Your subscription has expired. Access will be suspended on{' '}
        <span className="font-semibold mx-1">{formatDate(suspensionDate)}</span>.
        Please contact your administrator to renew.
      </div>
    );
  }

  if (days <= 14) {
    return (
      <div className="bg-[var(--yellow-100)] border-b border-[var(--yellow-100)] px-4 py-2 flex items-center gap-2 text-sm text-[var(--yellow-700)]">
        <AlertTriangleSVG />
        Your subscription expires in{' '}
        <span className="font-semibold mx-1">{days} day{days !== 1 ? 's' : ''}</span>
        on {formatDate(new Date(sub.endDate))}. Please contact your administrator to renew.
      </div>
    );
  }

  return null;
}
