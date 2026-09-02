'use client';
import { useEffect, useMemo, useState, use } from 'react';
import { useT } from '@/hooks/ui';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { ModuleCard } from '@/components/super-admin/ModuleCard';
import { cn } from '@/lib/utils/cn';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UsageBar } from '@/components/features/subscription';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { PaymentLogForm, type PaymentLogFormPayload } from '@/components/super-admin/PaymentLogForm';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { usePackages } from '@/hooks/superadmin';
import {
  usePaymentLogs,
  useCreatePaymentLog,
  useDeletePaymentLog,
  useCreateSubscription,
  useRenewSubscription,
  useCancelSubscription,
  useChangeSubscriptionPlan,
  useRefundInvoice,
} from '@/hooks/superadmin';
import { useOrgUsage } from '@/hooks/org';
import { toast } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';
import { Input } from '@/components/ui/input';
import {
  PLATFORM_FEATURES,
  USOOL_BASE_FEATURE,
  USOOL_SUB_FEATURES,
  RASEED_BASE_FEATURE,
  HARAKA_BASE_FEATURE,
  ZEYARA_BASE_FEATURE,
  BANNA_FEATURE,
} from '@/lib/config/package-feature-groups';
import {
  FEATURE_KEYS,
  defaultFeatureWhenAbsent,
  FEATURE_LABELS,
  HARAKA_MODULES,
  HARAKA_MODULE_LABELS,
  EMPTY_ADD_ONS,
  type FeatureKey,
  type HarakaModule,
  type SubscriptionAddOns,
  type Subscription,
  type SubscriptionStatus,
  type PaymentLog,
  type Invoice,
  type InvoicePaymentMethod,
} from '@/types';

type OverrideKey = 'usool' | 'raseed' | 'users' | 'spaces';

// Parse a limit-override input: blank = null (use plan default), else a
// non-negative integer.
function parseOverride(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Math.floor(Number(t));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizeAddOns(a: SubscriptionAddOns) {
  return { ...a, extraHarakaModules: [...a.extraHarakaModules].sort() };
}

function daysUntil(d: Date | string): number {
  const target = typeof d === 'string' ? new Date(d) : d;
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

type RenewDateErrorKind = 'required' | 'mustBeFuture' | null;

function renewEndDateErrorKind(value: string): RenewDateErrorKind {
  if (!value) return 'required';
  return new Date(value).getTime() <= Date.now() ? 'mustBeFuture' : null;
}

export default function OrgSubscriptionPage(props: { params: Promise<{ orgId: string }> }) {
  const params = use(props.params);
  const { orgId } = params;
  const router = useRouter();
  const { t, locale } = useT();
  const qc = useQueryClient();

  const { data: sub, isLoading: subLoading } = useQuery<Subscription | null>({
    queryKey: ['subscription', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/subscription`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to load subscription');
      return res.json();
    },
  });

  const { data: packages = [] } = usePackages();
  const { data: usage } = useOrgUsage(orgId);
  const { data: payments = [] } = usePaymentLogs(orgId);
  const createPayment = useCreatePaymentLog(orgId);
  const deletePayment = useDeletePaymentLog(orgId);
  const createSubscription = useCreateSubscription(orgId);
  const renewSubscription = useRenewSubscription(orgId);
  const cancelSubscription = useCancelSubscription(orgId);
  const changePlan = useChangeSubscriptionPlan(orgId);
  const refundInvoice = useRefundInvoice(orgId);

  const [createPackageId, setCreatePackageId] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewEndDate, setRenewEndDate] = useState('');
  const [renewInvoiceNow, setRenewInvoiceNow] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [changePlanPackageId, setChangePlanPackageId] = useState('');
  const [changePlanInvoiceNow, setChangePlanInvoiceNow] = useState(false);

  const [refundInvoiceTarget, setRefundInvoiceTarget] = useState<Invoice | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/invoices`);
      if (!res.ok) throw new Error('Failed to load invoices');
      return res.json();
    },
  });

  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [packageId, setPackageId] = useState<string>('');
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(() =>
    FEATURE_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<FeatureKey, boolean>),
  );
  const [harakaModules, setHarakaModules] = useState<HarakaModule[]>([]);
  const [addOns, setAddOns] = useState<SubscriptionAddOns>(EMPTY_ADD_ONS);
  const [overrides, setOverrides] = useState<Record<OverrideKey, string>>({
    usool: '', raseed: '', users: '', spaces: '',
  });
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentLog | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<InvoicePaymentMethod>('CASH');
  const [payDate, setPayDate] = useState('');
  const [paying, setPaying] = useState(false);

  // Hydrate form fields from the fetched subscription. The form has many
  // intertwined handlers (handleSaveMeta, handlePackageChange,
  // handleFeatureToggle) that all read/write these state vars, so extracting
  // a child with key={sub.id} is a substantial restructure. Default missing
  // FEATURE_KEYS to true so a newly added key doesn't silently disable the
  // feature for orgs that pre-date the key.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!sub) return;
    setEndDate(sub.endDate ? new Date(sub.endDate).toISOString().slice(0, 10) : '');
    setStatus(sub.status);
    setPackageId(sub.packageId ?? '');
    setFeatures(
      FEATURE_KEYS.reduce(
        (acc, k) => ({ ...acc, [k]: sub.features?.[k] ?? defaultFeatureWhenAbsent(k) }),
        {} as Record<FeatureKey, boolean>,
      ),
    );
    setHarakaModules(sub.activeHarakaModules ?? []);
    setAddOns({ ...EMPTY_ADD_ONS, ...sub.activeAddOns });
    setOverrides({
      usool: sub.limitOverrides.usool != null ? String(sub.limitOverrides.usool) : '',
      raseed: sub.limitOverrides.raseed != null ? String(sub.limitOverrides.raseed) : '',
      users: sub.limitOverrides.users != null ? String(sub.limitOverrides.users) : '',
      spaces: sub.limitOverrides.spaces != null ? String(sub.limitOverrides.spaces) : '',
    });
  }, [sub]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      toast.success(t('common.updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('subscription.featuresUpdateFailed'));
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleCreateSubscription() {
    if (!createPackageId) return;
    setCreatingSub(true);
    try {
      await createSubscription.mutateAsync({ packageId: createPackageId });
      toast.success(t('common.created'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    } finally {
      setCreatingSub(false);
    }
  }

  const renewErrorKind = renewEndDateErrorKind(renewEndDate);
  const renewEndDateError =
    renewErrorKind === 'required' ? t('subscription.renewDateRequired')
    : renewErrorKind === 'mustBeFuture' ? t('subscription.renewDateMustBeFuture')
    : null;

  async function handleRenew() {
    if (renewEndDateError) return;
    try {
      const res = await renewSubscription.mutateAsync({
        endDate: new Date(renewEndDate).toISOString(),
        generateInvoiceNow: renewInvoiceNow,
      });
      toast.success(res.invoiceId ? t('subscription.renewedWithInvoice') : t('subscription.renewed'));
      setRenewOpen(false);
      setRenewEndDate('');
      setRenewInvoiceNow(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) { toast.error(t('subscription.cancelReasonRequired')); return; }
    try {
      await cancelSubscription.mutateAsync({ reason: cancelReason.trim() });
      toast.success(t('subscription.cancelled'));
      setCancelOpen(false);
      setCancelReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  const changePlanTargetPackage = useMemo(
    () => packages.find((p) => p.id === changePlanPackageId) ?? null,
    [packages, changePlanPackageId],
  );
  const changePlanMode: 'upgrade' | 'downgrade' = useMemo(() => {
    const currentPrice = selectedPackage?.pricing.monthlyPrice ?? 0;
    const targetPrice = changePlanTargetPackage?.pricing.monthlyPrice ?? 0;
    return targetPrice < currentPrice ? 'downgrade' : 'upgrade';
  }, [selectedPackage, changePlanTargetPackage]);

  async function handleChangePlan() {
    if (!changePlanPackageId) return;
    try {
      const res = await changePlan.mutateAsync({
        packageId: changePlanPackageId,
        mode: changePlanMode,
        generateInvoiceNow: changePlanMode === 'upgrade' ? changePlanInvoiceNow : undefined,
      });
      toast.success(
        changePlanMode === 'downgrade'
          ? `${t('subscription.downgradeScheduled')} ${res.effectiveAt ? formatDate(new Date(res.effectiveAt)) : ''}`
          : t('subscription.upgraded'),
      );
      setChangePlanOpen(false);
      setChangePlanPackageId('');
      setChangePlanInvoiceNow(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  async function handleRefund() {
    if (!refundInvoiceTarget) return;
    if (!refundReason.trim()) { toast.error(t('subscription.refundReasonRequired')); return; }
    try {
      await refundInvoice.mutateAsync({
        invoiceId: refundInvoiceTarget.id,
        amount: refundAmount.trim() ? Number(refundAmount) : undefined,
        reason: refundReason.trim(),
      });
      toast.success(t('subscription.refunded'));
      setRefundInvoiceTarget(null);
      setRefundAmount('');
      setRefundReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  // Package + feature overrides are staged locally and only persisted when the
  // user clicks "Save Changes" (planSaveBar) — nothing is applied until save.
  function handlePackageChange(value: string) {
    setPackageId(value);
    // Choosing a package hydrates the feature toggles from it as new defaults;
    // the user can still tweak them before saving.
    if (value) {
      const pkg = packages.find((p) => p.id === value);
      if (pkg) {
        setFeatures(
          FEATURE_KEYS.reduce(
            (acc, k) => ({ ...acc, [k]: pkg.features?.[k] ?? false }),
            {} as Record<FeatureKey, boolean>,
          ),
        );
      }
    }
  }

  function handleFeatureToggle(key: FeatureKey, value: boolean) {
    setFeatures((f) => ({ ...f, [key]: value }));
  }

  function toggleHarakaModule(m: HarakaModule, on: boolean) {
    setHarakaModules((prev) => (on ? [...new Set([...prev, m])] : prev.filter((x) => x !== m)));
  }

  const overridesPayload = useMemo(
    () => ({
      usool: parseOverride(overrides.usool),
      raseed: parseOverride(overrides.raseed),
      users: parseOverride(overrides.users),
      spaces: parseOverride(overrides.spaces),
    }),
    [overrides],
  );

  // Effective cap shown in the meters: override ?? (plan allowance + add-ons),
  // mirroring the server-side effectiveResourceLimit. -1 = unlimited.
  function effLimit(kind: OverrideKey): number {
    const ov = overridesPayload[kind];
    if (ov != null) return ov;
    const a = selectedPackage?.allowances;
    const l = selectedPackage?.limits;
    switch (kind) {
      case 'usool': return a?.usoolIncluded ?? l?.maxAssets ?? -1;
      case 'raseed': return a?.raseedIncluded ?? l?.maxInventoryItems ?? -1;
      case 'users': { const b = a?.usersIncluded ?? l?.maxUsers ?? -1; return b === -1 ? -1 : b + addOns.extraUsers; }
      case 'spaces': { const b = a?.spacesIncluded ?? l?.maxSpaces ?? -1; return b === -1 ? -1 : b + addOns.extraSpaces; }
    }
  }

  // True when any staged plan field differs from what's persisted.
  const planDirty = useMemo(() => {
    if (!sub) return false;
    const pkgChanged = packageId !== (sub.packageId ?? '');
    const featsChanged = FEATURE_KEYS.some((k) => features[k] !== (sub.features?.[k] ?? defaultFeatureWhenAbsent(k)));
    const modulesChanged =
      JSON.stringify([...harakaModules].sort()) !==
      JSON.stringify([...(sub.activeHarakaModules ?? [])].sort());
    const addOnsChanged =
      JSON.stringify(normalizeAddOns(addOns)) !==
      JSON.stringify(normalizeAddOns({ ...EMPTY_ADD_ONS, ...sub.activeAddOns }));
    const savedOverrides = {
      usool: sub.limitOverrides.usool ?? null,
      raseed: sub.limitOverrides.raseed ?? null,
      users: sub.limitOverrides.users ?? null,
      spaces: sub.limitOverrides.spaces ?? null,
    };
    const overridesChanged = JSON.stringify(overridesPayload) !== JSON.stringify(savedOverrides);
    return pkgChanged || featsChanged || modulesChanged || addOnsChanged || overridesChanged;
  }, [sub, packageId, features, harakaModules, addOns, overridesPayload]);

  function resetPlan() {
    if (!sub) return;
    setPackageId(sub.packageId ?? '');
    setFeatures(
      FEATURE_KEYS.reduce(
        (acc, k) => ({ ...acc, [k]: sub.features?.[k] ?? defaultFeatureWhenAbsent(k) }),
        {} as Record<FeatureKey, boolean>,
      ),
    );
    setHarakaModules(sub.activeHarakaModules ?? []);
    setAddOns({ ...EMPTY_ADD_ONS, ...sub.activeAddOns });
    setOverrides({
      usool: sub.limitOverrides.usool != null ? String(sub.limitOverrides.usool) : '',
      raseed: sub.limitOverrides.raseed != null ? String(sub.limitOverrides.raseed) : '',
      users: sub.limitOverrides.users != null ? String(sub.limitOverrides.users) : '',
      spaces: sub.limitOverrides.spaces != null ? String(sub.limitOverrides.spaces) : '',
    });
  }

  async function handleSavePlan() {
    setSavingPlan(true);
    try {
      await patchSubscription({
        packageId: packageId || null,
        features,
        activeHarakaModules: harakaModules,
        activeAddOns: addOns,
        limitOverrides: overridesPayload,
      });
      toast.success(t('common.updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('subscription.packageUpdateFailedMsg'));
    } finally {
      setSavingPlan(false);
    }
  }

  const planSaveBar = (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <Button size="sm" onClick={handleSavePlan} disabled={!planDirty || savingPlan}>
        {savingPlan ? t('common.saving') : t('common.saveChanges')}
      </Button>
      {planDirty && !savingPlan && (
        <Button size="sm" variant="outline" onClick={resetPlan}>
          {t('common.discard')}
        </Button>
      )}
      {planDirty && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {t('common.unsavedChanges')}
        </span>
      )}
    </div>
  );

  async function handleCreatePayment(data: PaymentLogFormPayload) {
    if (!sub) return;
    try {
      await createPayment.mutateAsync({
        ...data,
        subscriptionId: sub.id,
      });
      toast.success(t('common.saved'));
      setPaymentOpen(false);
    } catch {
      toast.error(t('common.saveFailed'));
    }
  }

  async function handleDeletePayment() {
    if (!paymentToDelete) return;
    try {
      await deletePayment.mutateAsync(paymentToDelete.id);
      toast.success(t('common.deleted'));
      setPaymentToDelete(null);
    } catch {
      toast.error(t('common.deleteFailed'));
    }
  }

  function openPay(inv: Invoice) {
    setPayInvoice(inv);
    setPayMethod('CASH');
    setPayDate(new Date().toISOString().slice(0, 10));
  }

  async function handleMarkPaid() {
    if (!payInvoice) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/invoices/${payInvoice.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: payMethod, paidAt: payDate ? new Date(payDate).toISOString() : undefined }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(typeof b.error === 'string' ? b.error : 'Failed to mark paid');
      }
      toast.success(t('common.updated'));
      qc.invalidateQueries({ queryKey: ['invoices', orgId] });
      setPayInvoice(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    } finally {
      setPaying(false);
    }
  }

  const paymentColumns: ColumnDef<PaymentLog>[] = [
    { key: 'paidAt', header: t('col.date'), render: (p) => formatDate(new Date(p.paidAt)) },
    {
      key: 'amount',
      header: t('subscription.price'),
      render: (p) => `${p.amount.toFixed(2)} ${p.currency}`,
    },
    {
      key: 'method',
      header: t('subscription.paymentMethod'),
      render: (p) => <span className="text-xs">{p.method.replace('_', ' ')}</span>,
    },
    {
      key: 'reference',
      header: t('subscription.paymentReference'),
      render: (p) => p.reference || <span className="text-gray-400">—</span>,
    },
    {
      key: 'notes',
      header: t('col.notes'),
      render: (p) => p.notes || <span className="text-gray-400">—</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <Button size="sm" variant="ghost" aria-label={t('subscription.deletePayment')} onClick={() => setPaymentToDelete(p)}>
          <Trash2 className="h-3.5 w-3.5 text-red-600" />
        </Button>
      ),
    },
  ];

  const invoiceColumns: ColumnDef<Invoice>[] = [
    { key: 'dueDate', header: t('col.date'), render: (i) => formatDate(new Date(i.dueDate)) },
    {
      key: 'total',
      header: t('subscription.price'),
      render: (i) => (
        <span>
          {i.total.toFixed(2)} {i.currency}
          {i.foundingCohortDiscount > 0 && (
            <span className="text-xs text-gray-400"> (−{i.foundingCohortDiscount.toFixed(2)})</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('subscription.status'),
      render: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (i) => {
        if (i.status === 'PAID') {
          return (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600">{i.paymentMethod?.replace('_', ' ')}</span>
              <Button size="sm" variant="ghost" onClick={() => setRefundInvoiceTarget(i)}>
                {t('subscription.refund')}
              </Button>
            </div>
          );
        }
        if (i.status === 'REFUNDED') {
          return (
            <span className="text-xs text-gray-500">
              {i.refundAmount?.toFixed(2)} {i.currency} — {i.refundReason}
            </span>
          );
        }
        if (i.status === 'VOID') {
          return <span className="text-xs text-gray-400">{t('subscription.voided')}</span>;
        }
        return <Button size="sm" variant="outline" onClick={() => openPay(i)}>Mark paid</Button>;
      },
    },
  ];

  const subDays = sub ? daysUntil(sub.endDate) : 0;

  return (
    <div>
      <PageHeader
        title={t('nav.subscription')}
        breadcrumb={[
          { label: t('nav.organizations'), href: `/${locale}/superadmin` },
          { label: t('nav.subscription') },
        ]}
        actions={<Button variant="outline" size="sm" onClick={() => router.back()}>{t('common.back')}</Button>}
      />

      {subLoading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}

      {!subLoading && !sub && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('subscription.noSubscription')}</h3>
            <p className="text-sm text-gray-500">{t('subscription.noSubscriptionHint')}</p>
            <div className="flex items-end gap-3">
              <div className="space-y-1.5 flex-1 max-w-xs">
                <Label>{t('nav.packages')}</Label>
                <Combobox
                  value={createPackageId || null}
                  onChange={(v) => setCreatePackageId(v ?? '')}
                  placeholder={t('common.selectPlaceholder')}
                  options={packages.map((p) => ({ value: p.id, label: p.name }))}
                  searchable
                />
              </div>
              <Button onClick={handleCreateSubscription} disabled={!createPackageId || creatingSub}>
                {creatingSub ? t('common.creating') : t('subscription.createSubscription')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sub && (
        <>
          <Card className="mb-4">
            <CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={sub.status} />
                  <span className="text-sm text-gray-500">
                    {sub.status === 'CANCELLED'
                      ? `${t('subscription.cancelledOn')} ${sub.cancelledAt ? formatDate(new Date(sub.cancelledAt)) : ''}`
                      : `${t('col.end')}: ${formatDate(new Date(sub.endDate))} (${subDays < 0 ? `${Math.abs(subDays)}d ago` : `${subDays}d`})`}
                  </span>
                </div>
                {sub.status !== 'CANCELLED' && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => { setRenewEndDate(''); setRenewOpen(true); }}>
                      {t('subscription.renew')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setChangePlanPackageId(''); setChangePlanOpen(true); }}>
                      {t('subscription.changePlan')}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setCancelOpen(true)}>
                      {t('subscription.cancel')}
                    </Button>
                  </div>
                )}
              </div>
              {sub.pendingPackageId && sub.pendingChangeEffectiveAt && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
                  {t('subscription.downgradePending')}{' '}
                  {packages.find((p) => p.id === sub.pendingPackageId)?.name ?? sub.pendingPackageId}
                  {' '}{t('subscription.effectiveOn')} {formatDate(new Date(sub.pendingChangeEffectiveAt))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('subscription.renew')}</DialogTitle></DialogHeader>
              <DialogBody className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('subscription.newEndDate')}</Label>
                  <DatePicker value={renewEndDate} onChange={(v) => setRenewEndDate(v ?? '')} />
                  {renewEndDate && renewEndDateError ? (
                    <p className="text-xs text-red-600">{renewEndDateError}</p>
                  ) : (
                    <p className="text-xs text-gray-400">{t('subscription.renewDefaultHint')}</p>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={renewInvoiceNow} onChange={(e) => setRenewInvoiceNow(e.target.checked)} />
                  {t('subscription.generateInvoiceNow')}
                </label>
              </DialogBody>
              <DialogFooter>
                <Button onClick={handleRenew} disabled={!!renewEndDateError || renewSubscription.isPending} className="w-full sm:w-auto">
                  {renewSubscription.isPending ? t('common.saving') : t('subscription.renew')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('subscription.changePlan')}</DialogTitle></DialogHeader>
              <DialogBody className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('subscription.newPackage')}</Label>
                  <Combobox
                    value={changePlanPackageId || null}
                    onChange={(v) => setChangePlanPackageId(v ?? '')}
                    placeholder={t('common.selectPlaceholder')}
                    options={packages.filter((p) => p.id !== sub.packageId).map((p) => ({ value: p.id, label: p.name }))}
                    searchable
                  />
                </div>
                {changePlanPackageId && (
                  <div className="rounded-lg bg-gray-50 border border-border px-3 py-2 text-xs text-gray-600">
                    {changePlanMode === 'upgrade'
                      ? t('subscription.upgradeImmediateHint')
                      : `${t('subscription.downgradeScheduledHint')} ${sub.endDate ? formatDate(new Date(sub.endDate)) : ''}`}
                  </div>
                )}
                {changePlanPackageId && changePlanMode === 'upgrade' && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={changePlanInvoiceNow} onChange={(e) => setChangePlanInvoiceNow(e.target.checked)} />
                    {t('subscription.generateInvoiceNow')}
                  </label>
                )}
              </DialogBody>
              <DialogFooter>
                <Button onClick={handleChangePlan} disabled={!changePlanPackageId || changePlan.isPending} className="w-full sm:w-auto">
                  {changePlan.isPending ? t('common.saving') : t('subscription.confirmChangePlan')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('subscription.cancel')}</DialogTitle></DialogHeader>
              <DialogBody className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('subscription.cancelReason')}</Label>
                  <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  onClick={handleCancel}
                  disabled={!cancelReason.trim() || cancelSubscription.isPending}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {cancelSubscription.isPending ? t('common.saving') : t('subscription.confirmCancel')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!refundInvoiceTarget} onOpenChange={(v) => { if (!v) setRefundInvoiceTarget(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('subscription.refund')}</DialogTitle></DialogHeader>
              <DialogBody className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('subscription.refundAmount')}</Label>
                  <Input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder={refundInvoiceTarget ? `Full amount: ${refundInvoiceTarget.total.toFixed(2)}` : ''}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('subscription.refundReason')}</Label>
                  <Textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3} />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  onClick={handleRefund}
                  disabled={!refundReason.trim() || refundInvoice.isPending}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {refundInvoice.isPending ? t('common.saving') : t('subscription.confirmRefund')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">{t('subscription.status')}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-500">{t('subscription.current')}</span>
                  <StatusBadge status={sub.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-500">{t('col.start')}</span>
                  <span className="text-sm">{formatDate(new Date(sub.startDate))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-500">{t('col.end')}</span>
                  <span className={`text-sm ${subDays < 0 ? 'text-red-600' : subDays <= 30 ? 'text-amber-600' : 'text-gray-700'}`}>
                    {formatDate(new Date(sub.endDate))} ({subDays < 0 ? `${Math.abs(subDays)}d ago` : `${subDays}d`})
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-3">
                <div className="space-y-1.5">
                  <Label>{t('subscription.endDate')}</Label>
                  <DatePicker value={endDate} onChange={(v) => setEndDate(v ?? '')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('subscription.status')}</Label>
                  <Combobox
                    value={status}
                    onChange={(v) => setStatus((v ?? 'ACTIVE') as SubscriptionStatus)}
                    options={[
                      { value: 'ACTIVE', label: t('status.active') },
                      { value: 'EXPIRED', label: t('status.expired') },
                      { value: 'SUSPENDED', label: t('subscription.suspended') },
                    ]}
                    searchable={false}
                    clearable={false}
                  />
                </div>
                <Button size="sm" onClick={handleSaveMeta} disabled={savingMeta || !endDate}>
                  {savingMeta ? t('common.saving') : t('subscription.saveStatusDate')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">{t('nav.packages')}</h3>
              <Combobox
                value={packageId || null}
                onChange={(v) => handlePackageChange(v ?? '')}
                options={packages.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="— Unassigned —"
                searchable
              />
              {selectedPackage && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 line-clamp-3">{selectedPackage.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span>
                      <span className="text-gray-400">{t('subscription.price')}:</span>{' '}
                      {selectedPackage.pricing.isCustom
                        ? `Custom${selectedPackage.pricing.monthlyPrice != null ? ` (from ${selectedPackage.pricing.monthlyPrice} ${selectedPackage.pricing.currency})` : ''}`
                        : selectedPackage.pricing.monthlyPrice != null
                          ? `${selectedPackage.pricing.monthlyPrice} ${selectedPackage.pricing.currency}/mo${selectedPackage.pricing.annualPrice != null ? ` · ${selectedPackage.pricing.annualPrice} ${selectedPackage.pricing.currency}/yr` : ''}`
                          : '—'}
                    </span>
                    <span>
                      <span className="text-gray-400">{t('subscription.trial')}:</span>{' '}
                      {selectedPackage.trialDays > 0 ? `${selectedPackage.trialDays}d` : 'none'}
                    </span>
                  </div>
                </div>
              )}
              {planSaveBar}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">{t('subscription.usage')}</h3>
              <UsageBar
                label={t('subscription.assets')}
                current={usage?.assets ?? 0}
                max={effLimit('usool')}
              />
              <UsageBar
                label={t('subscription.users')}
                current={usage?.users ?? 0}
                max={effLimit('users')}
              />
              <UsageBar
                label={t('subscription.spaces')}
                current={usage?.spaces ?? 0}
                max={effLimit('spaces')}
              />
              <UsageBar
                label={t('subscription.inventoryItems')}
                current={usage?.inventoryItems ?? 0}
                max={effLimit('raseed')}
              />
              <UsageBar
                label={t('subscription.warranties')}
                current={usage?.warranties ?? 0}
                max={selectedPackage?.limits.maxWarranties ?? -1}
              />
            </CardContent>
          </Card>

          {/* Same collapsible module-card pattern as the user invite/edit
              permissions editor (components/users/PermissionsEditor.tsx) —
              toggle pill, name, "X of Y" count, chevron, expandable body. */}
          <Card className="lg:col-span-3">
            <CardContent className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('subscription.featureOverrides')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('subscription.featureOverridesHint')}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-1 mb-1.5">Platform</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {PLATFORM_FEATURES.map((k) => (
                    <label key={k} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-surface-page cursor-pointer">
                      <input type="checkbox" checked={features[k]} onChange={(e) => handleFeatureToggle(k, e.target.checked)} />
                      <span className="text-sm text-gray-700">{FEATURE_LABELS[k]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <ModuleCard
                  label="Usool — Assets"
                  enabled={features[USOOL_BASE_FEATURE]}
                  onToggleEnabled={(v) => handleFeatureToggle(USOOL_BASE_FEATURE, v)}
                  countLabel={`${USOOL_SUB_FEATURES.filter((k) => features[k]).length} of ${USOOL_SUB_FEATURES.length}`}
                >
                  {USOOL_SUB_FEATURES.map((k) => (
                    <label key={k} className="flex items-center gap-2 text-xs cursor-pointer hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={features[k]}
                        onChange={(e) => handleFeatureToggle(k, e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className={cn('text-gray-600', features[k] && 'text-gray-900 font-medium')}>{FEATURE_LABELS[k]}</span>
                    </label>
                  ))}
                </ModuleCard>

                <ModuleCard
                  label="Raseed — Inventory"
                  enabled={features[RASEED_BASE_FEATURE]}
                  onToggleEnabled={(v) => handleFeatureToggle(RASEED_BASE_FEATURE, v)}
                  countLabel={addOns.purchasesRequests ? '1 of 1 add-on' : '0 of 1 add-on'}
                >
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-gray-900">
                    <input
                      type="checkbox"
                      checked={addOns.purchasesRequests}
                      onChange={(e) => setAddOns((a) => ({ ...a, purchasesRequests: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className={cn('text-gray-600', addOns.purchasesRequests && 'text-gray-900 font-medium')}>Purchases &amp; Requests</span>
                  </label>
                </ModuleCard>

                <ModuleCard
                  label="Haraka — Point of Sale"
                  enabled={features[HARAKA_BASE_FEATURE]}
                  onToggleEnabled={(v) => handleFeatureToggle(HARAKA_BASE_FEATURE, v)}
                  countLabel={`${harakaModules.length} of ${HARAKA_MODULES.length} modules`}
                  defaultExpanded
                >
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">
                      Included slots: {selectedPackage?.allowances.harakaIncludedModuleSlots ?? 0}. Modules
                      selected beyond the included slots are billed as add-ons.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {HARAKA_MODULES.map((m) => (
                        <label key={m} className="flex items-center gap-2 text-xs cursor-pointer hover:text-gray-900">
                          <input
                            type="checkbox"
                            checked={harakaModules.includes(m)}
                            onChange={(e) => toggleHarakaModule(m, e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className={cn('text-gray-600', harakaModules.includes(m) && 'text-gray-900 font-medium')}>{HARAKA_MODULE_LABELS[m]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-border pt-2.5 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Vehicle intake (car-care)</p>
                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={features.vehicleIntake}
                        onChange={(e) => handleFeatureToggle('vehicleIntake', e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className={cn('text-gray-600', features.vehicleIntake && 'text-gray-900 font-medium')}>Show plate-capture in the intake UI</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={addOns.vehicleIntake}
                        onChange={(e) => setAddOns((a) => ({ ...a, vehicleIntake: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className={cn('text-gray-600', addOns.vehicleIntake && 'text-gray-900 font-medium')}>Purchased / billed for this org</span>
                    </label>
                    <p className="text-[11px] text-gray-400">Both must be on for the vehicle-intake flow to work — the first controls visibility, the second is what billing checks.</p>
                  </div>

                  <div className="border-t border-border pt-2.5 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Add-ons</p>
                    {(
                      [
                        ['deliveryAgents', 'Workers'],
                        ['warrantyCerts', 'Warranty certificates'],
                        ['customization', 'Customization'],
                      ] as ['deliveryAgents' | 'warrantyCerts' | 'customization', string][]
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-xs cursor-pointer hover:text-gray-900">
                        <input
                          type="checkbox"
                          checked={addOns[key]}
                          onChange={(e) => setAddOns((a) => ({ ...a, [key]: e.target.checked }))}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className={cn('text-gray-600', addOns[key] && 'text-gray-900 font-medium')}>{label}</span>
                      </label>
                    ))}
                  </div>
                </ModuleCard>

                {/* Zeyara — separate vertical, its own feature key. Off by
                    default (see OPT_IN_FEATURE_KEYS); a superadmin flips this
                    per-org even outside a package that already includes it. */}
                <ModuleCard
                  label="Zeyara — Clinic"
                  enabled={features[ZEYARA_BASE_FEATURE]}
                  onToggleEnabled={(v) => handleFeatureToggle(ZEYARA_BASE_FEATURE, v)}
                >
                  <p className="text-xs text-gray-500">
                    Patients, providers, and visits over the same shared appointment engine as Haraka.
                  </p>
                </ModuleCard>

                {/* Document Reports is cross-vertical — a Haraka retailer's
                    inspection report and other verticals' reports are the
                    same engine — so it is its own row rather than a
                    Haraka-only add-on. */}
                <ModuleCard
                  label="Document Reports"
                  enabled={addOns.documentReports}
                  onToggleEnabled={(v) => setAddOns((a) => ({ ...a, documentReports: v }))}
                >
                  <p className="text-xs text-gray-500">
                    Org-defined report templates filled per customer encounter, printable and
                    shareable by no-login link. Available on whichever vertical the org holds.
                  </p>
                </ModuleCard>

                <ModuleCard
                  label="Banna — Custom Fields"
                  enabled={features[BANNA_FEATURE]}
                  onToggleEnabled={(v) => handleFeatureToggle(BANNA_FEATURE, v)}
                >
                  <p className="text-xs text-gray-500">Custom fields for assets, inventory, and customers.</p>
                </ModuleCard>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Account</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
                  <div className="space-y-1.5">
                    <Label>Extra users</Label>
                    <Input
                      type="number" min={0} inputMode="numeric"
                      value={String(addOns.extraUsers)}
                      onChange={(e) => setAddOns((a) => ({ ...a, extraUsers: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Extra spaces</Label>
                    <Input
                      type="number" min={0} inputMode="numeric"
                      value={String(addOns.extraSpaces)}
                      onChange={(e) => setAddOns((a) => ({ ...a, extraSpaces: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
                    />
                  </div>
                </div>
              </div>

              {planSaveBar}
            </CardContent>
          </Card>

          {/* ── Per-org limit overrides ──────────────────────────────── */}
          <Card className="lg:col-span-3">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Plan limits (this organization)</h3>
              <p className="text-xs text-gray-500">
                Leave blank to use the plan&apos;s included allowance. A value here overrides it for
                this organization only and applies immediately on save.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(
                  [
                    ['usool', t('subscription.assets')],
                    ['raseed', t('subscription.inventoryItems')],
                    ['users', t('subscription.users')],
                    ['spaces', t('subscription.spaces')],
                  ] as [OverrideKey, string][]
                ).map(([key, label]) => {
                  const eff = effLimit(key);
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input
                        type="number" min={0} inputMode="numeric"
                        value={overrides[key]}
                        placeholder={eff === -1 ? 'Unlimited' : `Plan: ${eff}`}
                        onChange={(e) => setOverrides((o) => ({ ...o, [key]: e.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>
              {planSaveBar}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">{t('subscription.paymentLog')}</h3>
                <Button size="sm" onClick={() => setPaymentOpen(true)}>
                  <Plus className="h-4 w-4 me-1" /> {t('subscription.recordPayment')}
                </Button>
              </div>
              <DataTable
                data={payments}
                columns={paymentColumns}
                emptyMessage={t('subscription.noPayments')}
                keyExtractor={(p) => p.id}
              />
            </CardContent>
          </Card>

          {/* ── Invoices ─────────────────────────────────────────────── */}
          <Card className="lg:col-span-3">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Invoices</h3>
              <DataTable
                data={invoices}
                columns={invoiceColumns}
                emptyMessage="No invoices generated yet."
                keyExtractor={(i) => i.id}
              />
            </CardContent>
          </Card>
        </div>
        </>
      )}

      {/* Mark invoice paid */}
      <Dialog open={!!payInvoice} onOpenChange={(o) => !o && setPayInvoice(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark invoice paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {payInvoice && (
              <div className="text-sm text-gray-600">
                {payInvoice.total.toFixed(2)} {payInvoice.currency}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t('subscription.paymentMethod')}</Label>
              <Combobox
                value={payMethod}
                onChange={(v) => setPayMethod((v ?? 'CASH') as InvoicePaymentMethod)}
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
                ]}
                searchable={false}
                clearable={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('col.date')}</Label>
              <DatePicker value={payDate} onChange={(v) => setPayDate(v ?? '')} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleMarkPaid} disabled={paying}>
                {paying ? t('common.saving') : t('common.saveChanges')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPayInvoice(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('subscription.recordPayment')}</DialogTitle>
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
        title={t('subscription.deletePaymentTitle')}
        description={t('subscription.deletePaymentDesc')
          .replace('{amount}', String(paymentToDelete?.amount ?? ''))
          .replace('{currency}', paymentToDelete?.currency ?? '')
          .replace('{date}', paymentToDelete ? formatDate(new Date(paymentToDelete.paidAt)) : '')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDeletePayment}
        loading={deletePayment.isPending}
      />
    </div>
  );
}
