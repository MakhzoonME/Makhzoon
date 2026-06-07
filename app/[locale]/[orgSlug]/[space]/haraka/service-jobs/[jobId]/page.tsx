'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ServiceJobStatusBadge } from '@/components/haraka/ServiceJobStatusBadge';
import { ServiceJobPaymentsPanel } from '@/components/haraka/ServiceJobPaymentsPanel';
import { ServiceJobInvoiceDialog } from '@/components/haraka/ServiceJobInvoiceDialog';
import { useServiceJob, useUpdateServiceJobStatus } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/date';
import type { ServiceJobStatus } from '@/types';

const STATUS_FLOW: ServiceJobStatus[] = ['new', 'confirmed', 'in_progress', 'done'];

export default function ServiceJobDetailPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.view_service_jobs');
  const params  = useParams<{ locale: string; orgSlug: string; space: string; jobId: string }>();
  const router  = useRouter();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = useServiceJob(params.jobId);
  const updateStatus = useUpdateServiceJobStatus();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  if (!featureAllowed || !isAllowed) return null;

  const currency = orgInfo?.currency ?? 'USD';
  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const job      = data?.job;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!job) return <div className="text-sm text-gray-400 p-6">Service job not found.</div>;

  async function advance() {
    if (!job) return;
    const idx  = STATUS_FLOW.indexOf(job.status as ServiceJobStatus);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    try {
      await updateStatus.mutateAsync({ id: job.id, status: next });
      toast.success(`Status updated to ${next.replace('_', ' ')}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  }

  async function cancel() {
    if (!job) return;
    try {
      await updateStatus.mutateAsync({ id: job.id, status: 'cancelled' });
      toast.success('Job cancelled');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  }

  const currentIdx = STATUS_FLOW.indexOf(job.status as ServiceJobStatus);
  const canAdvance = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 && job.status !== 'cancelled';
  const canCancel  = job.status !== 'done' && job.status !== 'cancelled';

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={job.jobNumber}
        description={`Service job${job.serviceType ? ` — ${job.serviceType.replace(/_/g, ' ')}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {job.status === 'done' && (
              <Button variant="outline" onClick={() => setInvoiceOpen(true)} className="gap-2">
                <FileText className="h-4 w-4" strokeWidth={1.75} />
                {job.invoiceNumber ? 'View Invoice' : 'Generate Invoice'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.push(`${base}/service-jobs`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
        }
      />

      {/* Status stepper */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ServiceJobStatusBadge status={job.status} />
            {job.invoiceNumber && (
              <span className="text-xs text-gray-400 font-mono">{job.invoiceNumber}</span>
            )}
          </div>
          <div className="flex gap-2">
            {canAdvance && (
              <Button size="sm" onClick={advance} disabled={updateStatus.isPending} style={{ background: 'var(--mod-haraka)' }}>
                {updateStatus.isPending ? 'Updating…' : `Mark ${STATUS_FLOW[currentIdx + 1]?.replace('_', ' ')}`}
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={cancel} disabled={updateStatus.isPending}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Stepper visual */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_FLOW.map((s, i) => {
            const done    = currentIdx > i || (currentIdx === STATUS_FLOW.length - 1);
            const current = s === job.status;
            return (
              <div key={s} className="flex items-center gap-1">
                <div className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                  current ? 'text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`} style={current ? { background: 'var(--mod-haraka)' } : undefined}>
                  {s.replace(/_/g, ' ')}
                </div>
                {i < STATUS_FLOW.length - 1 && <div className="h-px w-4 bg-gray-200 flex-shrink-0" />}
              </div>
            );
          })}
          {job.status === 'cancelled' && (
            <div className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-600 ml-1">
              cancelled
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Customer</div>
            <div>
              <div className="font-medium text-gray-800">{job.customerName}</div>
              {job.customerPhone && <div className="text-sm text-gray-500 mt-0.5">{job.customerPhone}</div>}
            </div>
            {job.scheduledAt && (
              <div className="text-sm text-gray-500 pt-2 border-t border-border">
                <span className="text-gray-400">Scheduled: </span>{formatDate(job.scheduledAt)}
              </div>
            )}
            {job.serviceAddress && (
              <div className="text-sm text-gray-500 pt-2 border-t border-border">
                <span className="text-gray-400 block text-xs mb-1">Address</span>
                {[job.serviceAddress.street, job.serviceAddress.area, job.serviceAddress.city].filter(Boolean).join(', ')}
              </div>
            )}
          </div>

          {/* Staff */}
          {job.staffMemberName && (
            <div className="rounded-xl border border-border bg-surface-page p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Assigned To</div>
              <div className="font-medium text-gray-800">{job.staffMemberName}</div>
            </div>
          )}

          {/* Payments */}
          <ServiceJobPaymentsPanel job={job} currency={currency} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Service lines */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Services</div>
            <div className="space-y-2">
              {job.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm py-2 border-b border-border last:border-0">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{item.name}</div>
                    {item.description && <div className="text-gray-400 text-xs mt-0.5">{item.description}</div>}
                    <div className="text-xs text-gray-400 mt-1">
                      {item.quantity} × {formatCurrency(item.unitPrice, currency)}
                      {item.discountAmount > 0 && ` − ${formatCurrency(item.discountAmount, currency)}`}
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-gray-800 text-sm flex-shrink-0">
                    {formatCurrency(item.lineTotal, currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 space-y-1 text-sm">
              {job.discountAmount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Discount</span>
                  <span className="font-mono text-red-500">−{formatCurrency(job.discountAmount, currency)}</span>
                </div>
              )}
              {job.taxAmount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span>
                  <span className="font-mono">{formatCurrency(job.taxAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 border-t border-border pt-2">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(job.total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="rounded-xl border border-border bg-surface-page p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Notes</div>
              <p className="text-sm text-gray-600 whitespace-pre-line">{job.notes}</p>
            </div>
          )}

          {/* Meta */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-2 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Created</span><span>{formatDate(job.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Updated</span><span>{formatDate(job.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice dialog */}
      {invoiceOpen && (
        <ServiceJobInvoiceDialog
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          job={job}
          orgSlug={params.orgSlug}
          orgName={orgInfo?.name ?? ''}
          currency={currency}
        />
      )}
    </div>
  );
}
