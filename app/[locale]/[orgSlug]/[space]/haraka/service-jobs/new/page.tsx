'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Check } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { CustomerSelect } from '@/components/haraka/CustomerSelect';
import { PlateCaptureDialog } from '@/components/haraka/PlateCaptureDialog';
import { ServiceLineEditor, type ServiceLineItem } from '@/components/haraka/ServiceLineEditor';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  useCreateServiceJob,
  useOcrPlate,
  useFindOrCreateVehicle,
  useCustomerVehicles,
  useDeliveryAgents,
  useAssignServiceJobAgents,
  useCustomer,
} from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast, useT } from '@/hooks/ui';
import { useOrgInfo, useSubscriptionFeatures } from '@/hooks/org';
import { useAuthStore } from '@/store/auth.store';
import { hasPermByKey } from '@/lib/permissions';

export default function NewServiceJobPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', harakaModule: 'services', moduleKey: 'haraka' });
  const { isAllowed, isAdmin } = useAdminGuard(['pos.create_service_jobs', 'pos.checkout_service_jobs']);
  const { user } = useAuthStore();
  const canSetPricing = isAdmin || (!!user && hasPermByKey(user, 'pos.checkout_service_jobs'));
  const router = useRouter();
  const params  = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  const createMut = useCreateServiceJob();
  const { t } = useT();
  const features = useSubscriptionFeatures();
  const vehicleIntakeEnabled = !!features.vehicleIntake;

  const currency = orgInfo?.currency ?? 'JOD';
  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const [customerName,    setCustomerName]    = useState('');
  const [customerPhone,   setCustomerPhone]   = useState('');
  const [customerId,      setCustomerId]      = useState<string | null>(null);
  const [serviceType,     setServiceType]     = useState('');
  const [staffMemberName] = useState('');
  const [scheduledAt,     setScheduledAt]     = useState(() => new Date().toISOString());
  const [notes,           setNotes]           = useState('');
  const [lines, setLines] = useState<ServiceLineItem[]>([
    { name: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, discountAmount: 0 },
  ]);

  // Vehicle intake (car-care add-on)
  const [plateNumber,     setPlateNumber]     = useState('');
  const [plateDialogOpen, setPlateDialogOpen] = useState(false);
  const [vehicleId,       setVehicleId]       = useState<string | null>(null);
  const [vehicleIsNew,    setVehicleIsNew]    = useState<boolean | null>(null);
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);
  const [plateCandidates, setPlateCandidates] = useState<{ plate: string; score: number }[]>([]);
  const ocrMut = useOcrPlate();
  const vehicleMut = useFindOrCreateVehicle();
  const { data: matchedCustomerData } = useCustomer(matchedCustomerId ?? undefined);
  const { data: customerVehiclesData } = useCustomerVehicles(customerId);
  const savedVehicles = customerVehiclesData?.items ?? [];
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  // Workers (only rendered if the org has active agents)
  const { data: agentsData } = useDeliveryAgents(true);
  const activeAgents = agentsData?.items ?? [];
  const [agentMode,      setAgentMode]      = useState<'auto' | 'manual'>('auto');
  const [manualAgentIds, setManualAgentIds] = useState<string[]>([]);
  const assignAgentsMut = useAssignServiceJobAgents();

  // Auto-fill customer from a matched vehicle's owner, once loaded.
  useEffect(() => {
    const c = matchedCustomerData?.customer;
    if (c && customerId !== c.id) {
      setCustomerId(c.id);
      setCustomerName(c.name);
      setCustomerPhone(c.phone ?? '');
    }
  }, [matchedCustomerData, customerId]);

  if (!featureAllowed || !isAllowed) return null;

  async function resolveVehicle(plate: string) {
    if (!plate.trim()) return
    try {
      const res = await vehicleMut.mutateAsync({ plateNumber: plate.trim().toUpperCase(), customerId })
      setVehicleId(res.vehicle.id)
      setVehicleIsNew(res.isNew)
      if (!res.isNew && res.vehicle.customerId && !customerId) {
        setMatchedCustomerId(res.vehicle.customerId)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to look up vehicle')
    }
  }

  async function handleCapturedPlate(dataUri: string) {
    setPlateCandidates([])
    try {
      const result = await ocrMut.mutateAsync(dataUri)
      if (result.plateNumber) {
        setPlateNumber(result.plateNumber)
        setPlateCandidates(result.candidates ?? [])
        await resolveVehicle(result.plateNumber)
      } else {
        toast.error('Could not read the plate — enter it manually')
      }
    } catch (err) {
      console.error('[plate-ocr] handleCapturedPlate failed', err)
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Plate recognition failed'
      toast.error(message)
    }
  }

  function pickPlateCandidate(plate: string) {
    setPlateNumber(plate)
    setPlateCandidates([])
    setVehicleId(null)
    setVehicleIsNew(null)
    resolveVehicle(plate)
  }

  function pickSavedVehicle(vehicle: { id: string; plateNumber: string }) {
    setPlateNumber(vehicle.plateNumber)
    setVehicleId(vehicle.id)
    setVehicleIsNew(false)
    setPlateCandidates([])
    setShowAddVehicle(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) { toast.error(t('serviceJobs.errCustomerRequired')); return; }
    const validLines = lines.filter((l) => l.name.trim() && l.unitPrice >= 0);
    if (validLines.length === 0) { toast.error(t('serviceJobs.errServiceRequired')); return; }

    try {
      let resolvedVehicleId = vehicleId;
      if (vehicleIntakeEnabled && plateNumber.trim() && !resolvedVehicleId) {
        const res = await vehicleMut.mutateAsync({ plateNumber: plateNumber.trim().toUpperCase(), customerId });
        resolvedVehicleId = res.vehicle.id;
      }

      const res = await createMut.mutateAsync({
        customerName:    customerName.trim(),
        customerPhone:   customerPhone.trim() || null,
        customerId:      customerId || null,
        serviceType:     serviceType || null,
        staffMemberName: staffMemberName.trim() || null,
        vehicleId:       resolvedVehicleId || null,
        scheduledAt:     scheduledAt || null,
        notes:           notes.trim() || null,
        items:           validLines.map((l) => ({
          name:           l.name,
          description:    l.description || null,
          quantity:       l.quantity,
          unitPrice:      l.unitPrice,
          taxRate:        l.taxRate,
          discountAmount: l.discountAmount,
        })),
      } as Parameters<typeof createMut.mutateAsync>[0]);
      const jobData = res as { job?: { jobNumber?: string; id?: string } };
      const jobId = jobData.job?.id;

      if (jobId && activeAgents.length > 0) {
        try {
          if (agentMode === 'auto') {
            await assignAgentsMut.mutateAsync({ jobId, mode: 'auto', count: 1 });
          } else if (manualAgentIds.length > 0) {
            await assignAgentsMut.mutateAsync({ jobId, mode: 'manual', agentIds: manualAgentIds });
          }
        } catch (err) {
          // Job is already created — assignment failure shouldn't block navigation.
          toast.error(err instanceof Error ? err.message : 'Job created, but agent assignment failed');
        }
      }

      toast.success(`${t('serviceJobs.newJob')} ${jobData.job?.jobNumber}`);
      router.push(`${base}/service-jobs/${jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  function toggleManualAgent(id: string) {
    setManualAgentIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={t('serviceJobs.newTitle')}
        description={t('serviceJobs.newSubtitle')}
        actions={
          <Button variant="ghost" onClick={() => router.push(`${base}/service-jobs`)}>
            <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{t('serviceJobs.sectionCustomer')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('serviceJobs.labelCustomerName')} *</label>
              <CustomerSelect
                value={customerId ? { id: customerId, name: customerName, phone: customerPhone || null } : null}
                onChange={(c) => {
                  setCustomerId(c?.id ?? null);
                  setCustomerName(c?.name ?? '');
                  setCustomerPhone(c?.phone ?? '');
                  setShowAddVehicle(false);
                  setPlateNumber('');
                  setVehicleId(null);
                  setVehicleIsNew(null);
                  setPlateCandidates([]);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('col.phone')}</label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+962 7…" />
            </div>
          </div>
        </div>

        {/* Vehicle (car-care add-on) */}
        {vehicleIntakeEnabled && (
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">{t('serviceJobs.sectionVehicle')}</h3>

            {savedVehicles.length > 0 && !showAddVehicle && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500">This customer&apos;s saved vehicles:</p>
                <div className="flex flex-wrap gap-1.5">
                  {savedVehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => pickSavedVehicle(v)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                        vehicleId === v.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-border bg-surface-card text-gray-700 hover:border-primary-500 hover:text-primary-700'
                      }`}
                    >
                      <span className="font-mono tracking-wider">{v.plateNumber}</span>
                      {(v.make || v.model) && (
                        <span className="text-gray-400 ms-1.5">{[v.make, v.model].filter(Boolean).join(' ')}</span>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setShowAddVehicle(true); setPlateNumber(''); setVehicleId(null); setVehicleIsNew(null); }}
                    className="rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-gray-500 hover:border-primary-500 hover:text-primary-700 transition-colors"
                  >
                    + Add new vehicle
                  </button>
                </div>
              </div>
            )}

            {(savedVehicles.length === 0 || showAddVehicle) && (
              <div className="flex gap-2">
                <Input
                  value={plateNumber}
                  onChange={(e) => { setPlateNumber(e.target.value.toUpperCase()); setPlateCandidates([]); }}
                  onBlur={() => { if (plateNumber.trim() && !vehicleId) resolveVehicle(plateNumber); }}
                  placeholder={t('serviceJobs.labelPlateNumber')}
                  className="font-mono tracking-wider"
                />
                <Button type="button" variant="outline" onClick={() => setPlateDialogOpen(true)}>
                  <Camera className="h-4 w-4 me-2" /> {t('serviceJobs.capture')}
                </Button>
              </div>
            )}
            {(ocrMut.isPending || vehicleMut.isPending) && (
              <p className="text-xs text-gray-400">{t('serviceJobs.plateScanning')}</p>
            )}
            {plateCandidates.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500">Not quite right? Other readings:</p>
                <div className="flex flex-wrap gap-1.5">
                  {plateCandidates.map((c) => (
                    <button
                      key={c.plate}
                      type="button"
                      onClick={() => pickPlateCandidate(c.plate)}
                      className="rounded-md border border-border bg-surface-card px-2.5 py-1 font-mono text-xs tracking-wider text-gray-700 hover:border-primary-500 hover:text-primary-700 transition-colors"
                    >
                      {c.plate}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {vehicleId && vehicleIsNew === false && (
              <p className="flex items-center gap-1.5 text-xs text-green-700">
                <Check className="h-3.5 w-3.5" /> {t('serviceJobs.vehicleMatched')}
              </p>
            )}
            {vehicleId && vehicleIsNew === true && (
              <p className="text-xs text-gray-500">{t('serviceJobs.vehicleNew')}</p>
            )}
            <PlateCaptureDialog
              open={plateDialogOpen}
              onOpenChange={setPlateDialogOpen}
              onCaptured={handleCapturedPlate}
            />
          </div>
        )}

        {/* Job details */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{t('serviceJobs.sectionJobDetails')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('serviceJobs.labelServiceType')}</label>
              <ConfigSelect
                listKey="service_job_type"
                value={serviceType}
                onValueChange={setServiceType}
                placeholder={t('common.selectPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('serviceJobs.labelScheduled')}</label>
              <DateTimePicker value={scheduledAt} onChange={setScheduledAt} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('col.notes')}</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="…" />
          </div>
        </div>

        {/* Service lines */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{t('serviceJobs.sectionServices')}</h3>
          <ServiceLineEditor lines={lines} onChange={setLines} currency={currency} readOnlyPricing={!canSetPricing} />
        </div>

        {/* Agents (only shown if the org has active delivery agents) */}
        {activeAgents.length > 0 && (
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">{t('serviceJobs.sectionAgents')}</h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={agentMode === 'auto' ? 'default' : 'outline'}
                onClick={() => setAgentMode('auto')}
              >
                {t('serviceJobs.agentsAuto')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={agentMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setAgentMode('manual')}
              >
                {t('serviceJobs.agentsChange')}
              </Button>
            </div>
            {agentMode === 'manual' && (
              <div className="flex flex-wrap gap-2">
                {activeAgents.map((agent) => (
                  <button
                    type="button"
                    key={agent.id}
                    onClick={() => toggleManualAgent(agent.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      manualAgentIds.includes(agent.id)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-border'
                    }`}
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`${base}/service-jobs`)} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createMut.isPending} className="flex-1" style={{ background: 'var(--mod-haraka)' }}>
            {createMut.isPending ? t('common.creating') : t('serviceJobs.createBtn')}
          </Button>
        </div>
      </form>
    </div>
  );
}
