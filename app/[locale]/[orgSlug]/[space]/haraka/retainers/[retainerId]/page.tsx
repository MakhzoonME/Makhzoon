'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { RetainerStatusBadge } from '@/components/haraka/RetainerStatusBadge';
import { RetainerInvoiceList } from '@/components/haraka/RetainerInvoiceList';
import { useRetainer, useUpdateRetainerStatus } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import { useOrgInfo } from '@/hooks/org';
import type { RetainerStatus } from '@/types';

export default function RetainerDetailPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.view_retainers');
  const params  = useParams<{ locale: string; orgSlug: string; space: string; retainerId: string }>();
  const router  = useRouter();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = useRetainer(params.retainerId);
  const updateStatus = useUpdateRetainerStatus();
  if (!featureAllowed || !isAllowed) return null;

  const currency = orgInfo?.currency ?? 'USD';

  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const retainer = data?.retainer;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!retainer) return <div className="text-sm text-gray-400 p-6">Retainer not found.</div>;

  async function changeStatus(status: RetainerStatus) {
    if (!retainer) return;
    try {
      await updateStatus.mutateAsync({ id: retainer.id, status });
      toast.success(`Retainer ${status}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  }

  const taxAmount = retainer.amountPerCycle * retainer.taxRate;
  const totalPerCycle = retainer.amountPerCycle + taxAmount;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={retainer.name}
        description={`${retainer.retainerNumber} · ${retainer.billingCycle} retainer`}
        actions={
          <Button variant="ghost" onClick={() => router.push(`${base}/retainers`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-6">
          {/* Status card */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
            <div className="flex items-center justify-between">
              <RetainerStatusBadge status={retainer.status} />
              <div className="flex gap-2">
                {retainer.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={() => changeStatus('paused')} disabled={updateStatus.isPending}>
                    Pause
                  </Button>
                )}
                {retainer.status === 'paused' && (
                  <Button size="sm" variant="outline" onClick={() => changeStatus('active')} disabled={updateStatus.isPending} style={{ borderColor: '#22c55e', color: '#22c55e' }}>
                    Reactivate
                  </Button>
                )}
                {(retainer.status === 'active' || retainer.status === 'paused') && (
                  <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => changeStatus('cancelled')} disabled={updateStatus.isPending}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Contract info */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Contract</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-400">Billing Cycle</div>
                <div className="font-medium capitalize">{retainer.billingCycle}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Amount / Cycle</div>
                <div className="font-mono font-semibold">{formatCurrency(retainer.amountPerCycle, currency)}</div>
              </div>
              {retainer.taxRate > 0 && (
                <>
                  <div>
                    <div className="text-xs text-gray-400">Tax</div>
                    <div className="font-mono">{(retainer.taxRate * 100).toFixed(0)}% ({formatCurrency(taxAmount, currency)})</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Total / Cycle</div>
                    <div className="font-mono font-semibold">{formatCurrency(totalPerCycle, currency)}</div>
                  </div>
                </>
              )}
              <div>
                <div className="text-xs text-gray-400">Start Date</div>
                <div>{retainer.startDate}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">End Date</div>
                <div>{retainer.endDate ?? 'Open-ended'}</div>
              </div>
              {retainer.nextBillingDate && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-400">Next Billing Date</div>
                  <div className="font-medium">{retainer.nextBillingDate}</div>
                </div>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Client</div>
            <div className="font-medium text-gray-800">{retainer.customerName}</div>
            {retainer.customerPhone && <div className="text-sm text-gray-500">{retainer.customerPhone}</div>}
          </div>

          {retainer.notes && (
            <div className="rounded-xl border border-border bg-surface-page p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Notes</div>
              <p className="text-sm text-gray-600 whitespace-pre-line">{retainer.notes}</p>
            </div>
          )}
        </div>

        {/* Right — Invoices */}
        <div>
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Billing History</div>
            <RetainerInvoiceList retainer={retainer} currency={currency} />
          </div>
        </div>
      </div>
    </div>
  );
}
