'use client';
import { useAuthStore } from '@/store/auth.store';
import { useTransferStore } from '@/store/transfer.store';
import { useSubscription } from '@/hooks/useSubscription';
import { useOrgUsage } from '@/hooks/useOrgUsage';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UsageBar } from '@/components/shared/UsageBar';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { formatDate, daysUntil } from '@/lib/utils/date';

const FEATURE_LABELS: Record<string, string> = {
  warranties: 'Warranties',
  requests: 'Requests',
  reports: 'Reports',
  maintenance: 'Maintenance Records',
  checkouts: 'Asset Checkouts',
  notes: 'Asset Notes',
  support: 'Support Tickets',
};

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const { active, orgId: transferOrgId } = useTransferStore();

  const orgId =
    user?.role === 'super_admin'
      ? active && transferOrgId
        ? transferOrgId
        : null
      : (user?.organizationId ?? null);

  const { data: sub, isLoading: subLoading } = useSubscription(orgId);
  const { data: usage, isLoading: usageLoading } = useOrgUsage(orgId);

  if (subLoading) return <LoadingSkeleton rows={4} columns={2} />;

  const days = sub ? daysUntil(new Date(sub.endDate)) : 0;
  const enabledFeatures = Object.entries(sub?.features ?? {}).filter(([, v]) => v);
  const disabledFeatures = Object.entries(sub?.features ?? {}).filter(([, v]) => !v);

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription" />

      {/* Status */}
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Subscription Details
          </h2>
          {sub ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">Status</dt>
                <dd><StatusBadge status={sub.status} /></dd>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">Start Date</dt>
                <dd className="font-medium">{formatDate(new Date(sub.startDate))}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">End Date</dt>
                <dd className="font-medium">{formatDate(new Date(sub.endDate))}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-gray-500">Days Remaining</dt>
                <dd className="font-medium">
                  {days > 0 ? (
                    <span className="text-green-700">{days} days</span>
                  ) : (
                    <span className="text-red-600">Expired</span>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No subscription found.</p>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Usage
          </h2>
          {usageLoading ? (
            <LoadingSkeleton rows={4} columns={1} />
          ) : usage ? (
            <div className="space-y-4">
              <UsageBar label="Assets" current={usage.assets} max={-1} />
              <UsageBar label="Users" current={usage.users} max={-1} />
              <UsageBar label="Warranties" current={usage.warranties} max={-1} />
              <UsageBar label="Requests" current={usage.requests} max={-1} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Usage data unavailable.</p>
          )}
        </CardContent>
      </Card>

      {/* Feature flags */}
      {sub && Object.keys(sub.features ?? {}).length > 0 && (
        <Card className="max-w-2xl">
          <CardContent className="p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Features
            </h2>
            <div className="space-y-2 text-sm">
              {enabledFeatures.map(([key]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-gray-800">{FEATURE_LABELS[key] ?? key}</span>
                  <span className="text-xs text-green-600 ml-auto">Enabled</span>
                </div>
              ))}
              {disabledFeatures.map(([key]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                  <span className="text-gray-400">{FEATURE_LABELS[key] ?? key}</span>
                  <span className="text-xs text-gray-400 ml-auto">Disabled</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
