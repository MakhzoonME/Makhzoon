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
import { useT } from '@/hooks/useT';

function getFeatureLabelKey(feature: string): string {
  const keyMap: Record<string, string> = {
    warranties: 'subscription.warranties',
    requests: 'subscription.requests',
    reports: 'subscription.feature.reports',
    maintenance: 'subscription.feature.maintenance',
    checkouts: 'subscription.feature.checkouts',
    notes: 'subscription.feature.notes',
    support: 'subscription.feature.support',
  };
  return keyMap[feature] || feature;
}

export default function SubscriptionPage() {
  const { t } = useT();
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
      <PageHeader title={t('nav.subscription')} />

      {/* Status */}
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 dark:text-gray-300">
            {t('subscription.details')}
          </h2>
          {sub ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500 dark:text-gray-300">{t('subscription.status')}</dt>
                <dd><StatusBadge status={sub.status} /></dd>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500 dark:text-gray-300">{t('subscription.startDate')}</dt>
                <dd className="font-medium">{formatDate(new Date(sub.startDate))}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500 dark:text-gray-300">{t('subscription.endDate')}</dt>
                <dd className="font-medium">{formatDate(new Date(sub.endDate))}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-gray-500 dark:text-gray-300">{t('subscription.daysRemaining')}</dt>
                <dd className="font-medium">
                  {days > 0 ? (
                    <span className="text-green-700">{t('subscription.days').replace('{days}', String(days))}</span>
                  ) : (
                    <span className="text-red-600">{t('subscription.expired')}</span>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-300">{t('subscription.noSub')}</p>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 dark:text-gray-300">
            {t('subscription.usage')}
          </h2>
          {usageLoading ? (
            <LoadingSkeleton rows={4} columns={1} />
          ) : usage ? (
            <div className="space-y-4">
              <UsageBar label={t('subscription.assets')} current={usage.assets} max={-1} />
              <UsageBar label={t('subscription.users')} current={usage.users} max={-1} />
              <UsageBar label={t('subscription.warranties')} current={usage.warranties} max={-1} />
              <UsageBar label={t('subscription.requests')} current={usage.requests} max={-1} />
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-300">{t('subscription.usageUnavailable')}</p>
          )}
        </CardContent>
      </Card>

      {/* Feature flags */}
      {sub && Object.keys(sub.features ?? {}).length > 0 && (
        <Card className="max-w-2xl">
          <CardContent className="p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 dark:text-gray-300">
              {t('subscription.features')}
            </h2>
            <div className="space-y-2 text-sm">
              {enabledFeatures.map(([key]) => {
                const featureLabelKey = getFeatureLabelKey(key);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const label = t(featureLabelKey as any);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-gray-800 dark:text-gray-100">{label}</span>
                    <span className="text-xs text-green-600 ml-auto">{t('subscription.enabled')}</span>
                  </div>
                );
              })}
              {disabledFeatures.map(([key]) => {
                const featureLabelKey = getFeatureLabelKey(key);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const label = t(featureLabelKey as any);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-300" />
                    <span className="text-gray-400">{label}</span>
                    <span className="text-xs text-gray-400 ml-auto">{t('subscription.disabled')}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
