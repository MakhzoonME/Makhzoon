'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UsageBar } from '@/components/features/subscription';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { PaymentLogForm, type PaymentLogFormPayload } from '@/components/super-admin/PaymentLogForm';
import { usePackages } from '@/hooks/superadmin';
import {
  usePaymentLogs,
  useCreatePaymentLog,
  useDeletePaymentLog,
} from '@/hooks/superadmin';
import { useOrgUsage } from '@/hooks/org';
import { toast } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
  type Subscription,
  type SubscriptionStatus,
  type PaymentLog,
} from '@/types';

function daysUntil(d: Date | string): number {
  const target = typeof d === 'string' ? new Date(d) : d;
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function OrgSubscriptionPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params;
  const router = useRouter();
  const qc = useQueryClient();

  const { data: sub, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ['subscription', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/subscription`);
      if (!res.ok) throw new Error('Failed to load subscription');
      return res.json();
    },
  });

  const { data: packages = [] } = usePackages();
  const { data: usage } = useOrgUsage(orgId);
  const { data: payments = [] } = usePaymentLogs(orgId);
  const createPayment = useCreatePaymentLog(orgId);
  const deletePayment = useDeletePaymentLog(orgId);

  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [packageId, setPackageId] = useState<string>('');
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(() =>
    FEATURE_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<FeatureKey, boolean>),
  );
  const [savingMeta, setSavingMeta] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentLog | null>(null);

  useEffect(() => {
    if (!sub) return;
    setEndDate(sub.endDate ? new Date(sub.endDate).toISOString().slice(0, 10) : '');
    setStatus(sub.status);
    setPackageId(sub.packageId ?? '');
    // Default missing keys to true so a newly added FEATURE_KEY doesn't
    // silently disable the feature for orgs that pre-date the key.
    const merged = FEATURE_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: sub.features?.[k] ?? true }),
      {} as Record<FeatureKey, boolean>,
    );
    setFeatures(merged);
  }, [sub]);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === packageId) ?? null,
    [packages, packageId],
  );

  async function patchSubscription(payload: Record<string, unknown>) {
    const res = await fetch(`/api/organizations/${orgId}/subscription`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.formErrors?.[0] ?? body.error ?? 'Failed to update');
    }
    qc.invalidateQueries({ queryKey: ['subscription', orgId] });
    qc.invalidateQueries({ queryKey: ['all-orgs-usage'] });
  }

  async function handleSaveMeta() {
    setSavingMeta(true);
    try {
      await patchSubscription({ endDate: new Date(endDate).toISOString(), status });
      toast.success('Subscription updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSavingMeta(false);
    }
  }

  async function handlePackageChange(value: string) {
    const newId = value || null;
    setPackageId(value);
    try {
      const payload: Record<string, unknown> = { packageId: newId };
      // If a package was just chosen, hydrate features from it as the new defaults.
      if (newId) {
        const pkg = packages.find((p) => p.id === newId);
        if (pkg) {
          setFeatures(pkg.features);
          payload.features = pkg.features;
        }
      }
      await patchSubscription(payload);
      toast.success('Package updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update package');
    }
  }

  async function handleFeatureToggle(key: FeatureKey, value: boolean) {
    const next = { ...features, [key]: value };
    setFeatures(next);
    try {
      await patchSubscription({ features: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update features');
    }
  }

  async function handleCreatePayment(data: PaymentLogFormPayload) {
    if (!sub) return;
    try {
      await createPayment.mutateAsync({
        ...data,
        subscriptionId: sub.id,
      });
      toast.success('Payment recorded');
      setPaymentOpen(false);
    } catch {
      toast.error('Failed to record payment');
    }
  }

  async function handleDeletePayment() {
    if (!paymentToDelete) return;
    try {
      await deletePayment.mutateAsync(paymentToDelete.id);
      toast.success('Payment deleted');
      setPaymentToDelete(null);
    } catch {
      toast.error('Failed to delete payment');
    }
  }

  const paymentColumns: ColumnDef<PaymentLog>[] = [
    { key: 'paidAt', header: 'Date', render: (p) => formatDate(new Date(p.paidAt)) },
    {
      key: 'amount',
      header: 'Amount',
      render: (p) => `${p.amount.toFixed(2)} ${p.currency}`,
    },
    {
      key: 'method',
      header: 'Method',
      render: (p) => <span className="text-xs">{p.method.replace('_', ' ')}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (p) => p.reference || <span className="text-gray-400">—</span>,
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (p) => p.notes || <span className="text-gray-400">—</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <Button size="sm" variant="ghost" aria-label="Delete payment" onClick={() => setPaymentToDelete(p)}>
          <Trash2 className="h-3.5 w-3.5 text-red-600" />
        </Button>
      ),
    },
  ];

  const subDays = sub ? daysUntil(sub.endDate) : 0;

  return (
    <div>
      <PageHeader
        title="Subscription Management"
        breadcrumb={[
          { label: 'Organizations', href: '/superadmin' },
          { label: 'Subscription', href: '' },
        ]}
        actions={<Button variant="outline" size="sm" onClick={() => router.back()}>Back</Button>}
      />

      {subLoading && <p className="text-sm text-gray-500">Loading…</p>}

      {sub && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Current</span>
                  <StatusBadge status={sub.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Start</span>
                  <span className="text-sm">{formatDate(new Date(sub.startDate))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-500">End</span>
                  <span className={`text-sm ${subDays < 0 ? 'text-red-600' : subDays <= 30 ? 'text-amber-600' : 'text-gray-700'}`}>
                    {formatDate(new Date(sub.endDate))} ({subDays < 0 ? `${Math.abs(subDays)}d ago` : `${subDays}d`})
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-3">
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <DatePicker value={endDate} onChange={(v) => setEndDate(v ?? '')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                    className="flex h-9 w-full rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                <Button size="sm" onClick={handleSaveMeta} disabled={savingMeta || !endDate}>
                  {savingMeta ? 'Saving…' : 'Save Status & Date'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Package</h3>
              <select
                value={packageId}
                onChange={(e) => handlePackageChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
              >
                <option value="">— Unassigned —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selectedPackage && (
                <p className="text-xs text-gray-500 line-clamp-3">{selectedPackage.description}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Usage</h3>
              <UsageBar
                label="Assets"
                current={usage?.assets ?? 0}
                max={selectedPackage?.limits.maxAssets ?? -1}
              />
              <UsageBar
                label="Users"
                current={usage?.users ?? 0}
                max={selectedPackage?.limits.maxUsers ?? -1}
              />
              <UsageBar
                label="Warranties"
                current={usage?.warranties ?? 0}
                max={selectedPackage?.limits.maxWarranties ?? -1}
              />
              <UsageBar
                label="Requests"
                current={usage?.requests ?? 0}
                max={selectedPackage?.limits.maxRequests ?? -1}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Feature Overrides</h3>
              <p className="text-xs text-gray-500">
                Per-subscription feature toggles. Saved automatically. Defaults seed from the assigned package.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {FEATURE_KEYS.map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={features[k]}
                      onChange={(e) => handleFeatureToggle(k, e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">{FEATURE_LABELS[k]}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Payment Log</h3>
                <Button size="sm" onClick={() => setPaymentOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Record Payment
                </Button>
              </div>
              <DataTable
                data={payments}
                columns={paymentColumns}
                emptyMessage="No payments recorded yet."
                keyExtractor={(p) => p.id}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <PaymentLogForm
            onCancel={() => setPaymentOpen(false)}
            onSubmit={handleCreatePayment}
            submitting={createPayment.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!paymentToDelete}
        onOpenChange={(o) => !o && setPaymentToDelete(null)}
        title="Delete payment record?"
        description={`This will permanently remove the ${paymentToDelete?.amount} ${paymentToDelete?.currency} entry from ${paymentToDelete ? formatDate(new Date(paymentToDelete.paidAt)) : ''}.`}
        confirmLabel="Delete"
        onConfirm={handleDeletePayment}
        loading={deletePayment.isPending}
      />
    </div>
  );
}
