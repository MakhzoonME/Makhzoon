'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { apiFetch } from '@/lib/utils/api-fetch';
import { DEFAULT_ORDER_DOCUMENT_CONFIG, type OrderDocumentConfig } from '@/lib/modules/haraka/orders/order-document-config';
import { OrderDocumentPreview } from '@/components/haraka/OrderDocumentPreview';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';

const MOCK_ORDER = {
  id: 'preview',
  orderNumber: 'ORD-0042',
  invoiceNumber: 'INV-0042',
  channel: 'whatsapp',
  fulfillmentType: 'delivery',
  customerName: 'Ahmed Al-Hassan',
  customerPhone: '+962 79 000 0000',
  deliveryAddress: { street: '15 King Hussein Street', area: 'Abdali', city: 'Amman', notes: null },
  items: [
    { inventoryItemName: 'Wireless Headphones', quantity: 1, unitPrice: 45.000, discountAmount: 0, lineTotal: 45.000 },
    { inventoryItemName: 'Phone Case', quantity: 2, unitPrice: 8.500, discountAmount: 0, lineTotal: 17.000 },
    { inventoryItemName: 'USB-C Cable', quantity: 3, unitPrice: 3.000, discountAmount: 0, lineTotal: 9.000 },
  ],
  subtotal: 71.000,
  discountAmount: 5.000,
  taxAmount: 6.600,
  total: 72.600,
  paymentStatus: 'partial',
  amountPaid: 50.000,
  paymentMethod: 'cash',
  salesAgentName: 'Sara Khalil',
  deliveryAgentName: 'Bilal Nasser',
  notes: null,
  scheduledAt: null,
  createdAt: new Date().toISOString(),
};

const MOCK_PAYMENTS = [
  { id: '1', amount: 50.000, paymentMethod: 'cash', note: null },
];

export default function InvoiceSettingsPage() {
  const { data: orgInfo } = useOrgInfo();
  const [config, setConfig] = useState<OrderDocumentConfig>(DEFAULT_ORDER_DOCUMENT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: receiptSaved } = useQuery<{ tagline?: string; taxNumber?: string; config?: ReceiptConfig }>({
    queryKey: ['receipt-config'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/receipt-config');
      return res.ok ? res.json() : {};
    },
    staleTime: 60_000,
  });

  const receiptConfig: ReceiptConfig = receiptSaved?.config
    ? { ...DEFAULT_RECEIPT_CONFIG, ...receiptSaved.config }
    : DEFAULT_RECEIPT_CONFIG;

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
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Invoice</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Customize the invoice generated from orders.{' '}
            <a href="../settings/organization" className="text-primary-600 hover:underline">
              Edit branding
            </a>{' '}
            (logo, name, address, colors) in Organization Info.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
          <Save size={14} />{saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Left: configuration ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Invoice title */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Document title</h2>
              <div className="space-y-1.5">
                <Label>Invoice title</Label>
                <Input
                  value={config.invoiceTitle}
                  onChange={(e) => set('invoiceTitle', e.target.value)}
                  placeholder="TAX INVOICE"
                />
                <p className="text-[11px] text-gray-400">
                  Appears as the large heading at the top of every invoice.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Show / hide fields */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Content</h2>
              {([
                { key: 'showDeliveryAddress', label: 'Delivery address' },
                { key: 'showChannel',         label: 'Order channel (Phone, WhatsApp…)' },
                { key: 'showSalesAgent',      label: 'Sales agent name' },
                { key: 'showDeliveryAgent',   label: 'Delivery agent name' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="font-normal text-gray-700">{label}</Label>
                  <Switch checked={config[key]} onCheckedChange={(v) => set(key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Footer */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Footer</h2>
              <div className="space-y-1.5">
                <Label>Thank you message</Label>
                <Input
                  value={config.thankYouText}
                  onChange={(e) => set('thankYouText', e.target.value)}
                  placeholder="Thank you for your order!"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Terms and conditions</Label>
                <Textarea
                  value={config.termsText}
                  onChange={(e) => set('termsText', e.target.value)}
                  rows={3}
                  placeholder="All sales are final. Warranty applies to manufacturing defects only…"
                />
                <p className="text-[11px] text-gray-400">Printed at the bottom of every invoice.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: live preview (sticky) ── */}
        <div className="w-80 flex-shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto space-y-3">
          <p className="text-[11px] text-gray-400 text-center">Preview</p>
          <div
            className="rounded-xl overflow-hidden border border-border p-3"
            style={{ background: 'repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4 6px,#fafafa 6px,#fafafa 12px)' }}
          >
            <div style={{ width: 280, overflow: 'hidden' }}>
              <div style={{ transform: 'scale(0.405)', transformOrigin: 'top left', width: 692 }}>
                <OrderDocumentPreview
                  type="invoice"
                  order={MOCK_ORDER}
                  payments={MOCK_PAYMENTS}
                  orgName={receiptConfig.orgName || orgInfo?.name || 'Your Business'}
                  tagline={receiptSaved?.tagline ?? ''}
                  taxNumber={receiptSaved?.taxNumber ?? ''}
                  receiptConfig={receiptConfig}
                  docConfig={config}
                  currency="JOD"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
