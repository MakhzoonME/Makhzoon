'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { CustomerSelect } from '@/components/haraka/CustomerSelect';
import { ServiceLineEditor, type ServiceLineItem } from '@/components/haraka/ServiceLineEditor';
import { useCreateServiceJob } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';

export default function NewServiceJobPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.manage_service_jobs');
  const router = useRouter();
  const params  = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo }    = useOrgInfo();
  const { data: currentUser } = useCurrentUser();
  const createMut = useCreateServiceJob();
  if (!featureAllowed || !isAllowed) return null;

  const currency = orgInfo?.currency ?? 'USD';
  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId,    setCustomerId]    = useState<string | null>(null);
  const [serviceType,   setServiceType]   = useState('');
  const [staffMemberId, setStaffMemberId] = useState('');
  const [staffMemberName, setStaffMemberName] = useState('');
  const [scheduledAt,   setScheduledAt]   = useState('');
  const [notes,         setNotes]         = useState('');
  const [lines, setLines] = useState<ServiceLineItem[]>([
    { name: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, discountAmount: 0 },
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) { toast.error('Customer name is required'); return; }
    const validLines = lines.filter((l) => l.name.trim() && l.unitPrice >= 0);
    if (validLines.length === 0) { toast.error('Add at least one service line'); return; }

    try {
      const job = await createMut.mutateAsync({
        customerName:    customerName.trim(),
        customerPhone:   customerPhone.trim() || null,
        customerId:      customerId || null,
        serviceType:     serviceType || null,
        staffMemberId:   staffMemberId || null,
        staffMemberName: staffMemberName.trim() || null,
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
      toast.success(`Service job ${(job as { job?: { jobNumber?: string } }).job?.jobNumber} created`);
      router.push(`${base}/service-jobs/${(job as { job?: { id?: string } }).job?.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create service job');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="New Service Job"
        description="Create a service job for a repair, consultation, visit, or campaign."
        actions={
          <Button variant="ghost" onClick={() => router.push(`${base}/service-jobs`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Customer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Customer name *</label>
              <CustomerSelect
                value={customerName}
                onSelect={(c) => {
                  if (c) {
                    setCustomerId(c.id);
                    setCustomerName(c.name);
                    setCustomerPhone(c.phone ?? '');
                  }
                }}
                onNameChange={(v) => { setCustomerName(v); setCustomerId(null); }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+962 7…" />
            </div>
          </div>
        </div>

        {/* Job details */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Job Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Service type</label>
              <ConfigSelect
                listKey="service_job_type"
                value={serviceType}
                onValueChange={setServiceType}
                placeholder="Select type…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Scheduled date / time</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>

        {/* Service lines */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Services</h3>
          <ServiceLineEditor lines={lines} onChange={setLines} currency={currency} />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`${base}/service-jobs`)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createMut.isPending} className="flex-1" style={{ background: 'var(--mod-haraka)' }}>
            {createMut.isPending ? 'Creating…' : 'Create Service Job'}
          </Button>
        </div>
      </form>
    </div>
  );
}
