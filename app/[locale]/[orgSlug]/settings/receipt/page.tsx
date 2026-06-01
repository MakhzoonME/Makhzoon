'use client';

import { useEffect, useState } from 'react';
import {
  Printer, Plug2, Unplug, TestTube2, Copy, Download, Check,
  Share2, MessageCircle, Mail,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrinterStore } from '@/store/printer.store';
import { isWebUsbSupported, printRaw } from '@/lib/modules/haraka/printing/webusb-transport';
import { EscPosBuilder } from '@/lib/modules/haraka/printing/escpos-builder';
import { toast, useT, useOrgSlug } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAdminGuard } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';

const ACCENT_COLORS = [
  { value: '#1d4ed8', label: 'Indigo' },
  { value: '#0f766e', label: 'Teal' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#b91c1c', label: 'Red' },
  { value: '#000000', label: 'Black' },
];

interface ReceiptConfig {
  showLogo: boolean;
  showTaxNumber: boolean;
  showCashier: boolean;
  showFawtaraQr: boolean;
  showItemizedTax: boolean;
  footerText: string;
  accentColor: string;
}

function ReceiptPreview({
  orgName,
  tagline,
  config,
  paperWidth,
}: {
  orgName: string;
  tagline: string;
  config: ReceiptConfig;
  paperWidth: 58 | 80;
}) {
  const previewWidth = paperWidth === 58 ? 200 : 260;

  return (
    <div
      className="font-mono text-[10px] leading-[1.45] bg-white border border-gray-200 shadow-md px-4 py-5 mx-auto"
      style={{ width: previewWidth, color: '#111' }}
    >
      {/* Header */}
      {config.showLogo && (
        <div className="flex justify-center mb-2">
          <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-[8px] text-gray-400">LOGO</div>
        </div>
      )}
      <div className="text-center font-bold text-[11px] mb-0.5" style={{ color: config.accentColor }}>
        {orgName || 'Business Name'}
      </div>
      {tagline && <div className="text-center text-[9px] text-gray-500 mb-1">{tagline}</div>}

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Receipt meta */}
      <div className="flex justify-between text-[9px] text-gray-500 mb-1">
        <span>Receipt #1042</span>
        <span>12 Jun 2026</span>
      </div>
      {config.showCashier && (
        <div className="text-[9px] text-gray-500 mb-1">Cashier: Ahmad K.</div>
      )}

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Items */}
      {[
        { name: 'Product A', qty: 2, price: 'JOD 9.00' },
        { name: 'Product B', qty: 1, price: 'JOD 4.50' },
      ].map((item) => (
        <div key={item.name} className="flex justify-between mb-0.5">
          <span>{item.qty}× {item.name}</span>
          <span>{item.price}</span>
        </div>
      ))}

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Totals */}
      <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
        <span>Subtotal</span><span>JOD 13.50</span>
      </div>
      {config.showItemizedTax && (
        <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
          <span>Tax (16%)</span><span>JOD 2.16</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-[11px] mt-1">
        <span>Total</span><span style={{ color: config.accentColor }}>JOD 15.66</span>
      </div>

      {config.showTaxNumber && (
        <div className="text-[9px] text-gray-400 mt-1">Tax #: 123456789</div>
      )}

      {/* QR placeholder */}
      {config.showFawtaraQr && (
        <div className="flex justify-center mt-3">
          <div className="w-14 h-14 border border-gray-300 bg-gray-50 flex items-center justify-center text-[7px] text-gray-400">QR</div>
        </div>
      )}

      {/* Footer */}
      {config.footerText && (
        <>
          <div className="border-t border-dashed border-gray-300 mt-2 mb-1" />
          <div className="text-center text-[9px] text-gray-400">{config.footerText}</div>
        </>
      )}
    </div>
  );
}

export default function ReceiptSettingsPage() {
  const { t } = useT();
  const orgSlug = useOrgSlug();
  const { data: orgInfo } = useOrgInfo();
  const { isAllowed } = useAdminGuard('settings.fawtara');

  const { paperWidth, copies, paired, hydrate, pair, unpair, setPaperWidth, setCopies } = usePrinterStore();
  const [busy, setBusy] = useState(false);
  const supported = isWebUsbSupported();
  const [copied, setCopied] = useState(false);

  const [tagline, setTagline] = useState('');
  const [config, setConfig] = useState<ReceiptConfig>({
    showLogo: true,
    showTaxNumber: true,
    showCashier: true,
    showFawtaraQr: true,
    showItemizedTax: true,
    footerText: 'Thank you for your purchase!',
    accentColor: '#1d4ed8',
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!isAllowed) return null;

  function toggle(key: keyof Pick<ReceiptConfig, 'showLogo' | 'showTaxNumber' | 'showCashier' | 'showFawtaraQr' | 'showItemizedTax'>) {
    setConfig((c) => ({ ...c, [key]: !c[key] }));
  }

  async function handlePair() {
    setBusy(true);
    try {
      await pair();
      toast.success(t('register.printer'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function handleTestPrint() {
    setBusy(true);
    try {
      const bytes = new EscPosBuilder()
        .init().align('center').bold(true).size(17)
        .line('PRINTER TEST').size(0).bold(false)
        .line(orgInfo?.name ?? 'Makhzoon').feed(1)
        .align('left').line(`Paper: ${paperWidth} mm`).line(`Copies: ${copies}`)
        .line(new Date().toLocaleString()).feed(2).cut().build();
      const ok = await printRaw(bytes);
      if (ok) toast.success(t('register.reprintLast'));
      else toast.error(t('common.updateFailed'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setBusy(false);
    }
  }

  const shareLink = `https://rcpt.makhzoon.me/r/${orgSlug}/preview`;

  function handleCopyLink() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-semibold text-gray-900">{t('nav.receipt')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Customize the receipt your customers receive after a sale.</p>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Left: configuration ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Printer hardware */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Printer size={14} />Printer
              </h2>

              {/* Status */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-page px-4 py-3">
                <span className="text-sm font-medium text-gray-700">{t('register.printer')}</span>
                <span className={cn('text-sm font-medium', paired ? 'text-green-700' : 'text-gray-400')}>
                  {paired ? '● Paired' : '○ Not paired'}
                </span>
              </div>

              {!supported ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                  WebUSB not supported — use Chrome, Edge, or Brave.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Paper width</Label>
                      <Select value={String(paperWidth)} onValueChange={(v) => setPaperWidth(Number(v) as 58 | 80)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58">58 mm</SelectItem>
                          <SelectItem value="80">80 mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Copies per sale</Label>
                      <Input type="number" min="1" max="5" value={copies}
                        onChange={(e) => setCopies(Number(e.target.value || 1))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    {paired
                      ? <Button variant="outline" onClick={unpair} disabled={busy}><Unplug size={14} className="me-1" />Unpair</Button>
                      : <Button onClick={handlePair} disabled={busy}><Plug2 size={14} className="me-1" />Pair printer</Button>}
                    <Button variant="outline" onClick={handleTestPrint} disabled={busy || !paired}>
                      <TestTube2 size={14} className="me-1" />Test print
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Branding</h2>
              <div className="space-y-1.5">
                <Label>Business tagline</Label>
                <Input placeholder="e.g. Quality you can trust" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label>Accent color</Label>
                <div className="flex gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => setConfig((prev) => ({ ...prev, accentColor: c.value }))}
                      className={cn(
                        'w-7 h-7 rounded-full border-2 transition-all',
                        config.accentColor === c.value ? 'border-gray-700 scale-110' : 'border-transparent',
                      )}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content toggles */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Content</h2>
              {([
                { key: 'showLogo',        label: 'Show logo' },
                { key: 'showTaxNumber',   label: 'Show tax number' },
                { key: 'showCashier',     label: 'Show cashier name' },
                { key: 'showFawtaraQr',  label: 'Fawtara QR code' },
                { key: 'showItemizedTax', label: 'Itemized tax breakdown' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="font-normal text-gray-700">{label}</Label>
                  <Switch checked={config[key]} onCheckedChange={() => toggle(key)} />
                </div>
              ))}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <Label>Footer message</Label>
                <Input
                  value={config.footerText}
                  onChange={(e) => setConfig((c) => ({ ...c, footerText: e.target.value }))}
                  placeholder="e.g. Thank you for your purchase!"
                  maxLength={120}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: preview + share ── */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Thermal preview */}
          <div
            className="rounded-xl overflow-hidden border border-border p-5"
            style={{ background: 'repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4 6px,#fafafa 6px,#fafafa 12px)' }}
          >
            <ReceiptPreview
              orgName={orgInfo?.name ?? ''}
              tagline={tagline}
              config={config}
              paperWidth={paperWidth}
            />
          </div>

          {/* Deliver card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deliver this receipt</p>

              {/* Shareable link */}
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface-page px-3 py-2">
                <span className="text-[11px] text-gray-500 truncate flex-1">{shareLink}</span>
                <button onClick={handleCopyLink} className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
                  {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                </button>
              </div>

              {/* Share buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareLink)}`, '_blank')}>
                  <MessageCircle size={12} />WhatsApp
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => window.open(`mailto:?subject=Your receipt&body=${encodeURIComponent(shareLink)}`, '_blank')}>
                  <Mail size={12} />Email
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs col-span-2"
                  onClick={() => window.open(shareLink + '?download=1', '_blank')}>
                  <Download size={12} />Download PDF
                </Button>
              </div>

              <Button className="w-full gap-2" size="sm" onClick={handleTestPrint} disabled={busy || !paired}>
                <Printer size={13} />Print receipt
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
