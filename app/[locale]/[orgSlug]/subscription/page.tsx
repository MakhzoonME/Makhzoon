'use client';
import { useAuthStore } from '@/store/auth.store';
import { useTransferStore } from '@/store/transfer.store';
import { useSubscription } from '@/hooks/org';
import { useOrgUsage } from '@/hooks/org';
import { usePackages } from '@/hooks/superadmin';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { formatDate, daysUntil } from '@/lib/utils/date';
import { useT, useAdminGuard } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { INCLUSION_KEYS, INCLUSION_LABEL_KEYS } from '@/types';
import { Check, X, Wrench } from 'lucide-react';
import type { MessageKey } from '@/locales/messages';
import { useOrgSlug, useSpace } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';

const FEATURE_LABEL_KEY: Record<string, MessageKey> = {
  warranties: 'subscription.warranties',
  requests: 'subscription.requests',
  reports: 'subscription.feature.reports',
  maintenance: 'subscription.feature.maintenance',
  checkouts: 'subscription.feature.checkouts',
  notes: 'subscription.feature.notes',
  support: 'subscription.feature.support',
};

/* ── Mini progress bar ───────────────────────────────────────────── */
function MiniProgress({ pct }: { pct: number }) {
  const color = pct < 70 ? 'bg-green-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500';
  const track = pct < 70 ? 'bg-green-100' : pct < 90 ? 'bg-amber-100' : 'bg-red-100';
  return (
    <div className={cn('h-1.5 w-full rounded-full mt-1.5', track)}>
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Mini stat block ─────────────────────────────────────────────── */
function MiniStat({ label, current, max }: { label: string; current: number; max: number }) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : max === 0 ? 0 : Math.min((current / max) * 100, 100);
  return (
    <div>
      <div className="text-[12.5px] text-gray-500 mb-1">{label}</div>
      <div className="text-base font-semibold text-gray-900">
        {current.toLocaleString()} / {unlimited ? '∞' : max.toLocaleString()}
      </div>
      {!unlimited && <MiniProgress pct={pct} />}
    </div>
  );
}

export default function SubscriptionPage() {
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { isAllowed } = useAdminGuard('settings.subscription');
  const { user } = useAuthStore();
  const { active, orgId: transferOrgId } = useTransferStore();
  const orgSlug = useOrgSlug();
  const space = useSpace();

  const orgId =
    user?.role === 'super_admin'
      ? active && transferOrgId
        ? transferOrgId
        : null
      : (user?.organizationId ?? null);

  const { data: sub, isLoading: subLoading } = useSubscription(orgId);
  const { data: usage, isLoading: usageLoading } = useOrgUsage(orgId);
  const { data: packages = [], isLoading: packagesLoading } = usePackages();

  if (!isAllowed) return <div className="flex items-center justify-center h-48"><div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  if (subLoading || packagesLoading) return <LoadingSkeleton rows={4} columns={2} />;

  const pkg = packages.find((p) => p.id === sub?.packageId) ?? null;
  // Fall back to cached packageDetails stored on the subscription record
  const pkgName = pkg?.name ?? (sub?.packageDetails?.name as string | undefined) ?? null;
  const limits = pkg?.limits;
  const priceText = pkg
    ? pkg.pricing.isCustom
      ? pkg.pricing.monthlyPrice != null
        ? `${t('subscription.from')} ${pkg.pricing.monthlyPrice} ${pkg.pricing.currency}/${t('subscription.mo')}`
        : t('subscription.customPrice')
      : pkg.pricing.monthlyPrice != null
        ? `${pkg.pricing.monthlyPrice} ${pkg.pricing.currency}/${t('subscription.mo')}`
        : null
    : null;
  const days = sub ? daysUntil(new Date(sub.endDate)) : 0;
  const renewalText = sub && priceText
    ? `${t('subscription.renews')} ${formatDate(new Date(sub.endDate))} · ${priceText}`
    : sub
      ? `${t('subscription.renews')} ${formatDate(new Date(sub.endDate))}`
      : null;

  const allFeatures = [
    ...Object.entries(sub?.features ?? {}),
    ...INCLUSION_KEYS.map((k) => [k, pkg?.inclusions?.[k] ?? false] as [string, boolean]),
  ];
  const enabledFeatures = allFeatures.filter(([, v]) => v);
  const disabledFeatures = allFeatures.filter(([, v]) => !v);

  function getFeatureLabel(key: string): string {
    if (FEATURE_LABEL_KEY[key]) return t(FEATURE_LABEL_KEY[key]);
    const inclKey = INCLUSION_LABEL_KEYS[key as keyof typeof INCLUSION_LABEL_KEYS];
    if (inclKey) return t(inclKey);
    return key;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.subscription')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: t('nav.subscription') },
        ]}
      />

      {/* Top 2-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 max-w-4xl">
        {/* Plan overview card */}
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                {sub && <StatusBadge status={sub.status} />}
                <div className="text-2xl font-bold text-gray-900 mt-2">
                  {pkgName ?? (sub ? '—' : t('subscription.noSub'))}
                </div>
                {renewalText && (
                  <div className="text-[13px] text-gray-500 mt-1">{renewalText}</div>
                )}
                {!sub && (
                  <p className="text-sm text-gray-500 mt-2">{t('subscription.noSub')}</p>
                )}
              </div>
              {days > 0 ? (
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                  {t('subscription.days').replace('{days}', String(days))}
                </span>
              ) : sub ? (
                <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                  {t('subscription.expired')}
                </span>
              ) : null}
            </div>

            {/* Mini stats */}
            {!usageLoading && usage && (
              <div className="grid grid-cols-3 gap-4 mt-2">
                <MiniStat
                  label={t('subscription.assets')}
                  current={usage.assets}
                  max={limits?.maxAssets ?? -1}
                />
                <MiniStat
                  label={t('subscription.users')}
                  current={usage.users}
                  max={limits?.maxUsers ?? -1}
                />
                <MiniStat
                  label={t('subscription.warranties')}
                  current={usage.warranties}
                  max={limits?.maxWarranties ?? -1}
                />
              </div>
            )}
            {usageLoading && <LoadingSkeleton rows={1} columns={3} />}
          </CardContent>
        </Card>

        {/* Payment history card */}
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <h2 className="text-[15px] font-semibold text-gray-900 mb-4">{t('subscription.paymentHistory')}</h2>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-gray-400">{t('subscription.paymentHistoryUnavailable')}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 cursor-pointer transition-colors duration-150"
                onClick={() => {
                  if (orgSlug && space) {
                    window.location.href = `/${orgSlug}/${space}/support`;
                  }
                }}
              >
                <Wrench aria-hidden className="h-3.5 w-3.5 me-1" strokeWidth={1.75} />
                {t('subscription.contactSupport')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Included features grid */}
      {(enabledFeatures.length > 0 || disabledFeatures.length > 0) && (
        <Card className="max-w-4xl rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-gray-900">{t('subscription.inclusions')}</h2>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer transition-colors duration-150"
                onClick={() => {
                  if (orgSlug && space) {
                    window.location.href = `/${orgSlug}/${space}/support`;
                  }
                }}
              >
                <Wrench aria-hidden className="h-3.5 w-3.5 me-1" strokeWidth={1.75} />
                {t('subscription.contactSupport')}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
              {enabledFeatures.map(([key]) => (
                <div key={`on-${key}`} className="flex items-center gap-2 text-gray-800">
                  <Check aria-hidden className="h-3.5 w-3.5 text-green-600 flex-shrink-0" strokeWidth={2} />
                  {getFeatureLabel(key)}
                </div>
              ))}
              {disabledFeatures.map(([key]) => (
                <div key={`off-${key}`} className="flex items-center gap-2 text-gray-400">
                  <X aria-hidden className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" strokeWidth={2} />
                  {getFeatureLabel(key)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
