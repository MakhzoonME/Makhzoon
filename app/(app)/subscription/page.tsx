'use client';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { formatDate, daysUntil } from '@/lib/utils/date';
import { Subscription } from '@/types';

export default function SubscriptionPage() {
  const { user } = useAuthStore();

  const { data: sub, isLoading } = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${user?.organizationId}/subscription`);
      if (!res.ok) throw new Error('Failed to load subscription');
      return res.json();
    },
    enabled: !!user?.organizationId,
  });

  if (isLoading) return <LoadingSkeleton rows={4} columns={2} />;

  return (
    <div>
      <PageHeader title="Subscription" />
      <Card className="max-w-lg">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Subscription Details</h2>
          {sub ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">Status</dt>
                <dd><StatusBadge status={sub.status} /></dd>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">Start Date</dt>
                <dd className="font-medium">{formatDate(sub.startDate)}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <dt className="text-gray-500">End Date</dt>
                <dd className="font-medium">{formatDate(sub.endDate)}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-gray-500">Days Remaining</dt>
                <dd className="font-medium">
                  {daysUntil(sub.endDate) > 0
                    ? <span className="text-green-700">{daysUntil(sub.endDate)} days</span>
                    : <span className="text-red-600">Expired</span>
                  }
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No subscription found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
