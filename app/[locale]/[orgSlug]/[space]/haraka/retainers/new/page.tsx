'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerSelect } from '@/components/haraka/CustomerSelect';
import { useCreateRetainer } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, toast } from '@/hooks/ui';

export default function NewRetainerPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.manage_retainers');
  const router     = useRouter();
  const params     = useParams<{ locale: string; orgSlug: string; space: string }>();
  const createMut  = useCreateRetainer();
  if (!featureAllowed || !isAllowed) return null;

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const [name,            setName]            = useState('');
  const [customerName,    setCustomerName]    = useState('');
  const [customerPhone,   setCustomerPhone]   = useState('');
  const [customerId,      setCustomerId]      = useState<string | null>(null);
  const [billingCycle,    setBillingCycle]    = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [amountPerCycle,  setAmountPerCycle]  = useState('');
  const [taxRate,         setTaxRate]         = useState('0');
  const [startDate,       setStartDate]       = useState(new Date().toISOString().slice(0, 10));
  const [endDate,         setEndDate]         = useState('');
  const [notes,           setNotes]           = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim())        { toast.error('Service name is required'); return; }
    if (!customerName.trim()) { toast.error('Client name is required'); return; }
    const amount = parseFloat(amountPerCycle);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount per cycle'); return; }

    try {
      const result = await createMut.mutateAsync({
        name:           name.trim(),
        customerName:   customerName.trim(),
        customerPhone:  customerPhone.trim() || undefined,
        customerId:     customerId || undefined,
        billingCycle,
        amountPerCycle: amount,
        taxRate:        parseFloat(taxRate) / 100 || 0,
        startDate,
        endDate:        endDate || undefined,
        notes:          notes.trim() || undefined,
      });
      toast.success(`Retainer ${(result as { retainer?: { retainerNumber?: string } }).retainer?.retainerNumber} created`);
      router.push(`${base}/retainers/${(result as { retainer?: { id?: string } }).retainer?.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create retainer');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="New Retainer"
        description="Set up a recurring billing contract for a client."
        actions={
          <Button variant="ghost" onClick={() => router.push(`${base}/retainers`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service info */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Contract</h3>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Service / Contract name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Social Media Management, Monthly SEO Retainer…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>

        {/* Client */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Client</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Client name *</label>
              <CustomerSelect
                value={customerId ? { id: customerId, name: customerName, phone: customerPhone || null } : null}
                onChange={(c) => {
                  setCustomerId(c?.id ?? null);
                  setCustomerName(c?.name ?? '');
                  setCustomerPhone(c?.phone ?? '');
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+962 7…" />
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Billing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Billing cycle *</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as typeof billingCycle)}
                className="w-full rounded-lg border border-border bg-surface-page px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Amount per cycle *</label>
              <Input
                type="number" min="0" step="0.001"
                value={amountPerCycle} onChange={(e) => setAmountPerCycle(e.target.value)}
                placeholder="0.000" className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Tax %</label>
              <Input
                type="number" min="0" max="100" step="0.01"
                value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
                placeholder="0" className="font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Start date *</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">End date (optional)</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`${base}/retainers`)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createMut.isPending} className="flex-1" style={{ background: 'var(--mod-haraka)' }}>
            {createMut.isPending ? 'Creating…' : 'Create Retainer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
