'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequest } from '@/hooks/requests';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';
import { CustomFieldValuesSection } from '@/components/banna/CustomFieldValuesSection';
import type { MessageKey } from '@/locales/messages';
import { Check, X } from 'lucide-react';

const typeKeys: Record<string, MessageKey> = {
  REFILL: 'requestType.REFILL',
  RETIRE: 'requestType.RETIRE',
  BUY_NEW: 'requestType.BUY_NEW',
  EXTEND_WARRANTY: 'requestType.EXTEND_WARRANTY',
};

function KVRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-border last:border-0 items-start">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{children}</span>
    </div>
  );
}

export default function RequestDetailPage() {
  const { t, locale } = useT();
  const { requestId } = useParams<{ requestId: string }>();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { user } = useAuthStore();
  const { data: orgInfo } = useOrgInfo();
  const qc = useQueryClient();
  const { data: request, isLoading, error } = useRequest(requestId);
  const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  async function handleDecision(action: 'approve' | 'reject') {
    setProcessing(action);
    try {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/requests/${requestId}/${action}`, { method: 'POST', headers });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed to ${action} request`);
      }
      toast.success(action === 'approve' ? t('requests.approved') : t('requests.rejected'));
      qc.invalidateQueries({ queryKey: ['request'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (error || !request) return <ErrorState />;

  const base = `/${locale}/${orgSlug}/${space}`;
  const typeLabel = typeKeys[request.type] ? t(typeKeys[request.type]) : request.type;

  return (
    <div className="space-y-6">
      <PageHeader
        title={typeLabel}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.requests'), href: `${base}/requests` },
          { label: t('nav.requestsList'), href: `${base}/requests/list` },
          { label: typeLabel },
        ]}
        actions={
          isAdmin && request.status === 'PENDING' ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={!!processing}
                onClick={() => handleDecision('reject')}
              >
                <X className="h-4 w-4 me-1" strokeWidth={1.75} />
                {t('requests.rejected')}
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!!processing}
                onClick={() => handleDecision('approve')}
              >
                <Check className="h-4 w-4 me-1" strokeWidth={1.75} />
                {t('requests.approved')}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-card rounded-lg border border-border p-5">
            <KVRow label={t('col.status')}>
              <StatusBadge status={request.status} />
            </KVRow>
            <KVRow label={t('requests.type')}>{typeLabel}</KVRow>
            <KVRow label={t('requests.description')}>{request.description}</KVRow>
            {request.assetId && (
              <KVRow label={t('requests.reference')}>
                <button
                  className="text-primary-600 hover:underline text-sm"
                  onClick={() => router.push(`${base}/usool/${request.assetId}`)}
                >
                  {request.assetName ?? request.assetId}
                </button>
              </KVRow>
            )}
            {request.inventoryItemId && (
              <KVRow label={t('requests.reference')}>
                <button
                  className="text-primary-600 hover:underline text-sm"
                  onClick={() => router.push(`${base}/raseed/${request.inventoryItemId}`)}
                >
                  {request.inventoryItemName ?? request.inventoryItemId}
                </button>
              </KVRow>
            )}
            <KVRow label={t('requests.submittedBy')}>
              {request.createdByName ?? request.createdByEmail ?? request.createdBy}
            </KVRow>
            <KVRow label={t('col.date')}>{formatDate(request.createdAt)}</KVRow>
            {request.decisionAt && (
              <KVRow label={t('requests.decisionDate')}>
                {formatDate(request.decisionAt)}
              </KVRow>
            )}

            <CustomFieldValuesSection recordType="requests" recordId={requestId} />
          </div>
        </div>
      </div>
    </div>
  );
}
