'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ServiceJobStatusBadge } from '@/components/haraka/ServiceJobStatusBadge';
import { ServiceJobPaymentsPanel } from '@/components/haraka/ServiceJobPaymentsPanel';
import { ServiceJobInvoiceDialog } from '@/components/haraka/ServiceJobInvoiceDialog';
import { useServiceJob, useUpdateServiceJobStatus, useAddServiceJobItems } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAuthStore } from '@/store/auth.store';
import { hasPermByKey } from '@/lib/permissions';
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
  const addItems = useAddServiceJobItems();
  const { t } = useT();
  const { user } = useAuthStore();
  const isAdmin = !!user && ['admin', 'org_owner', 'super_admin'].includes(user.role);
  const canCheckout = isAdmin || (!!user && hasPermByKey(user, 'pos.checkout_service_jobs'));
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('0');
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
  if (!job) return <div className="text-sm text-gray-400 p-6">{t('common.noResults')}</div>;

  async function advance() {
    if (!job) return;
    const idx  = STATUS_FLOW.indexOf(job.status as ServiceJobStatus);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    try {
      await updateStatus.mutateAsync({ id: job.id, status: next });
      toast.success(t('serviceJobs.markAs').replace('{status}', next.replace(/_/g, ' ')));
    } catch (err) { toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong')); }
  }

  async function cancel() {
    if (!job) return;
    try {
      await updateStatus.mutateAsync({ id: job.id, status: 'cancelled' });
      toast.success(t('serviceJobs.cancelJob'));
    } catch (err) { toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong')); }
  }

  async function handleAddItem() {
    if (!job) return;
    const qty   = parseFloat(newItemQty) || 1;
    const price = parseFloat(newItemPrice) || 0;
    if (!newItemName.trim()) { toast.error(t('serviceJobs.errServiceRequired')); return; }
    try {
      await addItems.mutateAsync({
        id:    job.id,
        items: [{ name: newItemName.trim(), description: null, quantity: qty, unitPrice: price, taxRate: 0, discountAmount: 0 }],
      });
      setNewItemName(''); setNewItemQty('1'); setNewItemPrice('0'); setShowAddItem(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong')); }
  }

  const currentIdx = STATUS_FLOW.indexOf(job.status as ServiceJobStatus);
  const canAdvance = canCheckout && currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 && job.status !== 'cancelled';
  const canCancel  = canCheckout && job.status !== 'done' && job.status !== 'cancelled';
  const canAddItem = canCheckout && job.status !== 'done' && job.status !== 'cancelled';

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={job.jobNumber}
        description={`${t('serviceJobs.title')}${job.serviceType ? ` — ${job.serviceType.replace(/_/g, ' ')}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {job.status === 'done' && (job.invoiceNumber || canCheckout) && (
              <Button variant="outline" onClick={() => setInvoiceOpen(true)} className="gap-2">
                <FileText className="h-4 w-4" strokeWidth={1.75} />
                {job.invoiceNumber ? t('serviceJobs.viewInvoice') : t('serviceJobs.generateInvoice')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.push(`${base}/service-jobs`)}>
              <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
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
                {updateStatus.isPending ? t('common.saving') : t('serviceJobs.markAs').replace('{status}', (STATUS_FLOW[currentIdx + 1] ?? '').replace(/_/g, ' '))}
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={cancel} disabled={updateStatus.isPending}>
                {t('serviceJobs.cancelJob')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_FLOW.map((s, i) => {
            const done    = currentIdx > i;
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
            <div className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-600 ms-1">
              cancelled
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Customer */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('serviceJobs.sectionCustomer')}</div>
            <div>
              <div className="font-medium text-gray-800">{job.customerName}</div>
              {job.customerPhone && <div className="text-sm text-gray-500 mt-0.5">{job.customerPhone}</div>}
            </div>
            {job.scheduledAt && (
              <div className="text-sm text-gray-500 pt-2 border-t border-border">
                <span className="text-gray-400">{t('invoicePreview.scheduled')}: </span>{formatDate(job.scheduledAt)}
              </div>
            )}
            {job.serviceAddress && (
              <div className="text-sm text-gray-500 pt-2 border-t border-border">
                <span className="text-gray-400 block text-xs mb-1">{t('serviceJobs.labelAddress')}</span>
                {[job.serviceAddress.street, job.serviceAddress.area, job.serviceAddress.city].filter(Boolean).join(', ')}
              </div>
            )}
          </div>

          {job.staffMemberName && (
            <div className="rounded-xl border border-border bg-surface-page p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{t('serviceJobs.labelStaffMember')}</div>
              <div className="font-medium text-gray-800">{job.staffMemberName}</div>
            </div>
          )}

          <ServiceJobPaymentsPanel job={job} currency={currency} readOnly={!canCheckout} />
        </div>

        <div className="space-y-6">
          {/* Service lines */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('serviceJobs.sectionServices')}</div>
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
                  <span>{t('invoicePreview.discount')}</span>
                  <span className="font-mono text-red-500">−{formatCurrency(job.discountAmount, currency)}</span>
                </div>
              )}
              {job.taxAmount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>{t('invoicePreview.tax')}</span>
                  <span className="font-mono">{formatCurrency(job.taxAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 border-t border-border pt-2">
                <span>{t('invoicePreview.total')}</span>
                <span className="font-mono">{formatCurrency(job.total, currency)}</span>
              </div>
            </div>

            {canAddItem && (
              !showAddItem ? (
                <button
                  type="button"
                  onClick={() => setShowAddItem(true)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 py-1 rounded-lg border border-dashed border-primary-200 hover:border-primary-400 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> {t('serviceLine.addLine')}
                </button>
              ) : (
                <div className="space-y-3 pt-1 border-t border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                    <div className="space-y-1.5 sm:col-span-1">
                      <label className="text-xs font-medium text-gray-600">{t('serviceLine.labelService')} *</label>
                      <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="text-sm h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">{t('serviceLine.labelQty')}</label>
                      <Input type="number" min="0.001" step="0.001" value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)} className="font-mono text-sm h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">{t('serviceLine.labelUnitPrice')}</label>
                      <Input type="number" min="0" step="0.001" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} className="font-mono text-sm h-8" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowAddItem(false)} className="flex-1">{t('common.cancel')}</Button>
                    <Button size="sm" onClick={handleAddItem} disabled={addItems.isPending} className="flex-1" style={{ background: 'var(--mod-haraka)' }}>
                      {addItems.isPending ? t('common.saving') : t('serviceLine.addLine')}
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>

          {job.notes && (
            <div className="rounded-xl border border-border bg-surface-page p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{t('col.notes')}</div>
              <p className="text-sm text-gray-600 whitespace-pre-line">{job.notes}</p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-2 text-xs text-gray-400">
            <div className="flex justify-between"><span>{t('col.date')}</span><span>{formatDate(job.createdAt)}</span></div>
          </div>
        </div>
      </div>

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
