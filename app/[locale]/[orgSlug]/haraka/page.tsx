'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ListChecks } from 'lucide-react';
import { PageHeader, SubscriptionGate } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCurrentSession } from '@/hooks/haraka';

/**
 * Haraka landing — decides where the cashier should be.
 *  - Has open session → /haraka/register (Phase 3, placeholder for now)
 *  - No open session  → show "Open Session" CTA, plus link to history.
 */
export default function HarakaLandingPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string }>();
  const { data, isLoading } = useCurrentSession();

  useEffect(() => {
    if (!isLoading && data?.session) {
      router.replace(`/${params.locale}/${params.orgSlug}/haraka/sessions/${data.session.id}`);
    }
  }, [isLoading, data?.session, router, params.locale, params.orgSlug]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Haraka"
        description="Point of sale — open a session to start ringing up sales."
      />

      <div className="max-w-xl rounded-xl border border-border bg-surface-page p-8 text-center space-y-4">
        <div className="text-lg font-medium">No open session</div>
        <p className="text-sm text-gray-500">
          You need an open cash-drawer session before processing sales. Opening a session records your starting cash float.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <SubscriptionGate>
            <Button onClick={() => router.push(`/${params.locale}/${params.orgSlug}/haraka/sessions/new`)}>
              <Plus size={16} className="mr-1" /> Open new session
            </Button>
          </SubscriptionGate>
          <Button
            variant="outline"
            onClick={() => router.push(`/${params.locale}/${params.orgSlug}/haraka/sessions`)}
          >
            <ListChecks size={16} className="mr-1" /> Past sessions
          </Button>
        </div>
      </div>
    </div>
  );
}
