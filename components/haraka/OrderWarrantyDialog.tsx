'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Copy, Check, Download, FileImage, Loader2, ShieldCheck } from 'lucide-react';
import { useCreateWarrantyCert } from '@/hooks/haraka';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { WarrantyCertificatePreview, type WarrantyCertificateData } from '@/components/haraka/WarrantyCertificatePreview';
import { toast } from '@/hooks/ui';
import { apiFetch } from '@/lib/utils/api-fetch';
import type { HarakaOrder, OrderLineItem } from '@/types';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: HarakaOrder;
  orgName: string;
  orgSlug: string;
  tagline?: string;
  taxNumber?: string;
  receiptConfig?: ReceiptConfig;
  space: string;
}

function today() { return new Date().toISOString().slice(0, 10); }
function addYear(d: string) {
  const dt = new Date(d);
  dt.setFullYear(dt.getFullYear() + 1);
  return dt.toISOString().slice(0, 10);
}

export function OrderWarrantyDialog({ open, onOpenChange, order, orgName, orgSlug, tagline, taxNumber, receiptConfig, space }: Props) {
  const createCertMut = useCreateWarrantyCert();
  const [createdCertId, setCreatedCertId] = useState<string | null>(null);
  const items = order.items.filter((i: OrderLineItem) => i.inventoryItemId);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(items.map((i) => i.inventoryItemId)));
  const [vendor,     setVendor]     = useState('');
  const [startDate,  setStartDate]  = useState(today());
  const [endDate,    setEndDate]    = useState(addYear(today()));
  const [notes,      setNotes]      = useState('');
  const [terms,      setTerms]      = useState('This warranty covers manufacturing defects only. Physical damage, misuse, or unauthorized modifications void this warranty.');
  const [step,       setStep]       = useState<'form' | 'preview'>('form');
  const [saving,      setSaving]     = useState(false);
  const [capturing,   setCapturing]  = useState(false);
  const [copiedLink,  setCopiedLink] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const selectedItems = items.filter((i) => selectedIds.has(i.inventoryItemId));

  // Certificate number: W-{orderNumber}-{timestamp} — generated once per mount
  const [certNumber] = useState(() => `W-${order.orderNumber}-${Date.now().toString(36).toUpperCase().slice(-4)}`);

  const certData: WarrantyCertificateData = {
    certificateNumber: certNumber,
    customerName:      order.customerName,
    customerPhone:     order.customerPhone,
    orderNumber:       order.orderNumber,
    issueDate:         today(),
    startDate,
    endDate,
    vendor:            vendor || orgName,
    items:             selectedItems.map((i) => ({ name: i.inventoryItemName, quantity: i.quantity, sku: i.sku })),
    notes:             notes || null,
    termsText:         terms,
  };

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleCreate() {
    if (!vendor.trim()) { toast.error('Vendor is required'); return; }
    if (!startDate || !endDate) { toast.error('Start and end dates are required'); return; }
    if (selectedIds.size === 0) { toast.error('Select at least one item'); return; }
    if (endDate < startDate) { toast.error('End date must be after start date'); return; }

    setSaving(true);
    try {
      // Persist the certificate in haraka_warranty_certs (new backend)
      const { cert } = await createCertMut.mutateAsync({
        sourceType:        'order',
        orderId:           order.id,
        customerName:      order.customerName,
        customerPhone:     order.customerPhone ?? undefined,
        items:             selectedItems.map((i) => ({
          inventoryItemId:   i.inventoryItemId,
          inventoryItemName: i.inventoryItemName,
          sku:               i.sku ?? undefined,
          quantity:          i.quantity,
          unitPrice:         i.unitPrice,
        })),
        warrantyStartDate: startDate,
        warrantyEndDate:   endDate,
        notes:             notes || undefined,
      });
      setCreatedCertId(cert.id);

      // Also create Usool warranty records for each selected inventory item (existing behaviour)
      await Promise.allSettled(
        selectedItems.map((item) =>
          apiFetch('/api/warranties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-space-slug': space },
            body: JSON.stringify({
              inventoryItemId: item.inventoryItemId,
              vendor: vendor || orgName,
              startDate,
              endDate,
              reminder: true,
              notes: notes || undefined,
            }),
          })
        )
      );

      toast.success(`Warranty certificate ${cert.warrantyNumber} created`);
      setStep('preview');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create warranty');
    } finally { setSaving(false); }
  }

  function buildPublicUrl() {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    // If a cert was persisted, use the canonical /w/ URL
    if (createdCertId) return `${base}/w/${orgSlug}/${createdCertId}`;
    // Fallback: encode cert data in query string (for preview before save)
    const payload = { vendor: vendor || orgName, startDate, endDate, notes: notes || null, terms, certNumber, items: selectedItems.map((i) => ({ name: i.inventoryItemName, quantity: i.quantity, sku: i.sku })) };
    return `${base}/w/${orgSlug}/${order.id}?d=${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(buildPublicUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleDownloadPDF() {
    window.open(`${buildPublicUrl()}&download=1`, '_blank');
  }

  async function handleScreenshot() {
    if (!captureRef.current) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(captureRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `warranty-${order.orderNumber}.png`;
      a.click();
    } catch { toast.error('Screenshot failed'); }
    finally { setCapturing(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary-600" strokeWidth={1.75} />
            {step === 'form' ? 'Create Warranty Certificate' : 'Warranty Certificate'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <>
            <DialogBody className="space-y-5">
              {/* Item selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Covered items</label>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-400">No inventory-linked items in this order.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {items.map((item) => (
                      <label key={item.inventoryItemId} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-page">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.inventoryItemId)}
                          onChange={() => toggleItem(item.inventoryItemId)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600"
                        />
                        <span className="flex-1 text-sm text-gray-800">{item.inventoryItemName}</span>
                        <span className="text-xs text-gray-400">×{item.quantity}</span>
                        {item.sku && <span className="text-xs text-gray-400 font-mono">#{item.sku}</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Warranty details */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Vendor / Warranty issuer *</label>
                <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder={orgName} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Start date *</label>
                  <DatePicker value={startDate} onChange={setStartDate} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">End date *</label>
                  <DatePicker value={endDate} onChange={setEndDate} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes on this warranty…" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Terms & conditions</label>
                <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || selectedIds.size === 0}>
                {saving ? 'Creating…' : 'Create & Preview Certificate'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody>
              {/* Preview */}
              <div className="overflow-auto rounded-lg border border-border bg-gray-100 max-h-[54vh]">
                <div ref={captureRef} style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '181.8%' }}>
                  <WarrantyCertificatePreview
                    data={certData}
                    orgName={orgName}
                    tagline={tagline}
                    taxNumber={taxNumber}
                    receiptConfig={receiptConfig}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" onClick={handleDownloadPDF} className="flex-1 gap-2 justify-center">
                  <Download size={14} /> Download PDF
                </Button>
                <Button variant="outline" onClick={handleCopyLink} className="flex-1 gap-2 justify-center">
                  {copiedLink ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button variant="outline" onClick={handleScreenshot} disabled={capturing} className="flex-1 gap-2 justify-center">
                  {capturing ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                  Screenshot
                </Button>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('form')}>← Back</Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      {/* Print styles */}
      <style>{`@media print { body * { visibility: hidden } #warranty-certificate, #warranty-certificate * { visibility: visible } #warranty-certificate { position: fixed; top: 0; left: 0; width: 100%; } }`}</style>
    </Dialog>
  );
}
