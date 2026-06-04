'use client';

import { useEffect, useState } from 'react';
import { useOrgSlug } from '@/hooks/ui';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { apiFetch } from '@/lib/utils/api-fetch';
import { DEFAULT_ORDER_DOCUMENT_CONFIG, type OrderDocumentConfig } from '@/lib/modules/haraka/orders/order-document-config';
import { cn } from '@/lib/utils/cn';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative flex-shrink-0 overflow-hidden rounded-full transition-colors duration-200', checked ? 'bg-primary-600' : 'bg-gray-300')}
        style={{ width: 36, height: 20 }}
      >
        <span
          className={cn('absolute top-[3px] rounded-full bg-white shadow transition-[inset-inline-start] duration-200', checked ? 'start-[18px]' : 'start-[3px]')}
          style={{ width: 14, height: 14 }}
        />
      </button>
    </label>
  );
}

export default function OrderDocumentsSettingsPage() {
  const orgSlug = useOrgSlug();
  const { data: orgInfo } = useOrgInfo();
  const [config, setConfig] = useState<OrderDocumentConfig>(DEFAULT_ORDER_DOCUMENT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/organizations/order-document-config')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setConfig((c) => ({ ...c, ...data }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof OrderDocumentConfig>(key: K, value: OrderDocumentConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiFetch('/api/organizations/order-document-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save');
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Order Documents"
        description="Customize the invoice and receipt generated from orders."
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: 'Settings', href: `/${orgSlug}/settings` },
          { label: 'Order Documents' },
        ]}
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      {/* Document titles */}
      <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Document titles</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Invoice title</label>
            <Input value={config.invoiceTitle} onChange={(e) => set('invoiceTitle', e.target.value)} placeholder="TAX INVOICE" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Receipt title</label>
            <Input value={config.receiptTitle} onChange={(e) => set('receiptTitle', e.target.value)} placeholder="RECEIPT" />
          </div>
        </div>
        <p className="text-xs text-gray-400">These appear as the large heading at the top of each document.</p>
      </div>

      {/* Show/hide sections */}
      <div className="rounded-xl border border-border bg-surface-card p-5 space-y-1">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Show / hide fields</h3>
        <Toggle checked={config.showDeliveryAddress} onChange={(v) => set('showDeliveryAddress', v)} label="Delivery address" />
        <Toggle checked={config.showChannel} onChange={(v) => set('showChannel', v)} label="Order channel (Phone, WhatsApp…)" />
        <Toggle checked={config.showSalesAgent} onChange={(v) => set('showSalesAgent', v)} label="Sales agent name" />
        <Toggle checked={config.showDeliveryAgent} onChange={(v) => set('showDeliveryAgent', v)} label="Delivery agent name" />
      </div>

      {/* Footer / terms */}
      <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Footer</h3>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Thank you message</label>
          <Input value={config.thankYouText} onChange={(e) => set('thankYouText', e.target.value)} placeholder="Thank you for your order!" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Terms and conditions</label>
          <Textarea value={config.termsText} onChange={(e) => set('termsText', e.target.value)} rows={3} placeholder="All sales are final. Warranty applies to manufacturing defects only…" />
          <p className="text-xs text-gray-400">Printed at the bottom of every invoice and receipt.</p>
        </div>
      </div>

      <div className="pb-4">
        <p className="text-xs text-gray-400">
          Logo, org name, address, phone, and tax number are shared with the receipt settings —{' '}
          <a href="../receipt" className="text-primary-600 hover:underline">update them there</a>.
        </p>
      </div>
    </div>
  );
}
