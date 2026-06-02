'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Printer, Plug2, Unplug, TestTube2, Copy, Download, Check,
  Mail, Upload, X, Save,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePrinterStore } from '@/store/printer.store';
import { isWebUsbSupported, printRaw } from '@/lib/modules/haraka/printing/webusb-transport';
import { EscPosBuilder } from '@/lib/modules/haraka/printing/escpos-builder';
import { toast, useT, useOrgSlug } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAdminGuard } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';
import { ReceiptPreview, type TemplateId, type ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import type { ReceiptLang } from '@/lib/receipts/labels';
import { getReceiptBaseUrl } from '@/lib/app-env';

const ACCENT_COLORS = [
  { value: '#1d4ed8', label: 'Indigo' },
  { value: '#0f766e', label: 'Teal' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#b91c1c', label: 'Red' },
  { value: '#000000', label: 'Black' },
];

/** Accepts #RGB or #RRGGBB hex colors. */
const isValidHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

/** Expands #RGB → #RRGGBB so the native color input accepts it. */
function normalizeHex(v: string) {
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return v;
}

/** WhatsApp brand glyph (lucide ships no brand icons). */
function WhatsAppIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

interface TemplateOption { id: TemplateId; label: string; desc: string; icon: string }
const TEMPLATES: TemplateOption[] = [
  { id: 'thermal-58', label: 'Thermal 58mm', desc: 'Narrow thermal roll', icon: '🧾' },
  { id: 'thermal-80', label: 'Thermal 80mm', desc: 'Wide thermal roll', icon: '🧾' },
  { id: 'a4-modern',  label: 'A4 Modern',    desc: 'Clean A4 receipt',   icon: '📄' },
  { id: 'a4-invoice', label: 'A4 Invoice',   desc: 'Formal invoice',     icon: '📋' },
];

function TemplateSelector({ value, onChange }: { value: TemplateId; onChange: (t: TemplateId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-all',
            value === t.id
              ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
              : 'border-border bg-surface-page hover:border-gray-300',
          )}
        >
          <span className="text-base">{t.icon}</span>
          <span className="text-xs font-semibold text-gray-800">{t.label}</span>
          <span className="text-[11px] text-gray-400">{t.desc}</span>
        </button>
      ))}
    </div>
  );
}

const DEFAULT_CONFIG: ReceiptConfig = {
  template: 'thermal-58',
  showLogo: true,
  showTaxNumber: true,
  showCashier: true,
  showFawtaraQr: true,
  showItemizedTax: true,
  showAddress: true,
  showPhone: true,
  showWebsite: false,
  footerText: 'Thank you for your purchase!',
  footerTextAr: '',
  accentColor: '#1d4ed8',
  logo: null,
  phone: '',
  address: '',
  addressAr: '',
  website: '',
  orgNameAr: '',
  language: 'en',
};

const LANGUAGE_OPTIONS: { value: ReceiptConfig['language']; label: string }[] = [
  { value: 'en',   label: 'English' },
  { value: 'ar',   label: 'العربية' },
  { value: 'both', label: 'Both' },
];

export default function ReceiptSettingsPage() {
  const { t, locale } = useT();
  const orgSlug = useOrgSlug();
  const { data: orgInfo } = useOrgInfo();
  const { isAllowed } = useAdminGuard('settings.fawtara');
  const { paperWidth, copies, paired, hydrate, pair, unpair, setCopies } = usePrinterStore();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const supported = isWebUsbSupported();
  const [copied, setCopied] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const [tagline, setTagline] = useState('');
  const [taglineAr, setTaglineAr] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [config, setConfig] = useState<ReceiptConfig>(DEFAULT_CONFIG);
  // Preview-only language (not persisted). Only used when language === 'both';
  // defaults to the platform locale but the admin can flip it freely.
  const [previewLang, setPreviewLang] = useState<ReceiptLang>(locale === 'ar' ? 'ar' : 'en');
  // Resolved after mount so the share link matches the current env's rcpt host
  // (avoids an SSR/client hydration mismatch from window-based derivation).
  const [receiptBase, setReceiptBase] = useState('https://rcpt-app.makhzoon.me');
  useEffect(() => { setReceiptBase(getReceiptBaseUrl()); }, []);

  // Load saved config
  const { data: saved } = useQuery<{ tagline?: string; taglineAr?: string; taxNumber?: string; config?: ReceiptConfig }>({
    queryKey: ['receipt-config'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/receipt-config');
      return res.ok ? res.json() : {};
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!saved) return;
    if (saved.tagline !== undefined) setTagline(saved.tagline);
    if (saved.taglineAr !== undefined) setTaglineAr(saved.taglineAr);
    if (saved.taxNumber !== undefined) setTaxNumber(saved.taxNumber);
    if (saved.config) setConfig({ ...DEFAULT_CONFIG, ...saved.config });
  }, [saved]);

  useEffect(() => { hydrate(); }, [hydrate]);

  // The concrete language the preview renders in.
  const effPreviewLang: ReceiptLang =
    config.language === 'ar' ? 'ar' : config.language === 'en' ? 'en' : previewLang;
  // Which input sets to show: English unless Arabic-only, Arabic unless English-only.
  const needEn = config.language !== 'ar';
  const needAr = config.language !== 'en';
  const bothLangs = config.language === 'both';

  if (!isAllowed) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/organizations/receipt-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagline, taglineAr, taxNumber, config }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to save');
      toast.success(t('common.updated'));
      qc.invalidateQueries({ queryKey: ['receipt-config'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof ReceiptConfig>(key: K, val: ReceiptConfig[K]) {
    setConfig((c) => ({ ...c, [key]: val }));
  }

  function toggle(key: keyof Pick<ReceiptConfig, 'showLogo' | 'showTaxNumber' | 'showCashier' | 'showFawtaraQr' | 'showItemizedTax' | 'showAddress' | 'showPhone' | 'showWebsite'>) {
    setConfig((c) => ({ ...c, [key]: !c[key] }));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'logo');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Upload failed');
      const { url } = (await res.json()) as { url: string };
      set('logo', url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    }
  }

  async function handlePair() {
    setBusy(true);
    try { await pair(); toast.success(t('register.printer')); }
    catch (err) { toast.error(err instanceof Error ? err.message : t('common.updateFailed')); }
    finally { setBusy(false); }
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
    } catch (err) { toast.error(err instanceof Error ? err.message : t('common.updateFailed')); }
    finally { setBusy(false); }
  }

  const shareLink = `${receiptBase}/r/${orgSlug}/preview`;

  const isThermal = config.template === 'thermal-58' || config.template === 'thermal-80';

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">{t('nav.receipt')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customize the receipt your customers receive after a sale.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
          <Save size={14} />{saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Left: configuration ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Template */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Template</h2>
              <TemplateSelector value={config.template} onChange={(v) => set('template', v)} />
            </CardContent>
          </Card>

          {/* Printer hardware */}
          {(
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Printer size={14} />Printer
                </h2>
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
                        <div className="text-sm text-gray-600 font-medium py-2">
                          {config.template === 'thermal-58' ? '58 mm' : '80 mm'}
                        </div>
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
          )}

          {/* Receipt language */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Receipt language</h2>
              <p className="text-xs text-gray-500 -mt-1">
                Choose which language(s) your receipts are issued in. With “Both”, customers
                pick the language on the receipt page and the cashier picks it when printing.
              </p>
              <div className="inline-flex rounded-lg border border-border bg-surface-page p-0.5">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set('language', opt.value)}
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                      config.language === opt.value
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Branding</h2>

              {/* Logo upload */}
              <div className="space-y-1.5">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {config.logo
                    ? <img src={config.logo} alt="logo" className="w-12 h-12 object-contain border border-border rounded p-1 bg-white" />
                    : <div className="w-12 h-12 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[9px] text-gray-400">LOGO</div>
                  }
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <Upload size={13} className="me-1" />Upload
                    </Button>
                    {config.logo && (
                      <Button variant="outline" size="sm" onClick={() => set('logo', null)}>
                        <X size={13} />
                      </Button>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>

              {/* Business name (Arabic) — English name comes from the organization name */}
              {needAr && (
                <div className="space-y-1.5">
                  <Label>Business name (Arabic)</Label>
                  <Input
                    dir="rtl"
                    placeholder="اسم المتجر"
                    value={config.orgNameAr}
                    onChange={(e) => set('orgNameAr', e.target.value)}
                    maxLength={80}
                  />
                  <p className="text-[11px] text-gray-400">The English name uses your organization name ({orgInfo?.name ?? '—'}).</p>
                </div>
              )}

              {needEn && (
                <div className="space-y-1.5">
                  <Label>Business tagline{bothLangs ? ' (English)' : ''}</Label>
                  <Input placeholder="e.g. Quality you can trust" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={80} />
                </div>
              )}
              {needAr && (
                <div className="space-y-1.5">
                  <Label>Business tagline{bothLangs ? ' (Arabic)' : ''}</Label>
                  <Input dir="rtl" placeholder="جودة تثق بها" value={taglineAr} onChange={(e) => setTaglineAr(e.target.value)} maxLength={80} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input placeholder="+962 6 000 0000" value={config.phone} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tax number</Label>
                  <Input placeholder="123456789" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
                </div>
              </div>

              {needEn && (
                <div className="space-y-1.5">
                  <Label>Address{bothLangs ? ' (English)' : ''}</Label>
                  <Input placeholder="123 Main Street, Amman" value={config.address} onChange={(e) => set('address', e.target.value)} />
                </div>
              )}
              {needAr && (
                <div className="space-y-1.5">
                  <Label>Address{bothLangs ? ' (Arabic)' : ''}</Label>
                  <Input dir="rtl" placeholder="١٢٣ الشارع الرئيسي، عمّان" value={config.addressAr} onChange={(e) => set('addressAr', e.target.value)} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input placeholder="www.example.com" value={config.website} onChange={(e) => set('website', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Accent color</Label>
                <div className="flex gap-2 items-center">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => set('accentColor', c.value)}
                      className={cn(
                        'w-7 h-7 rounded-full border-2 transition-all',
                        config.accentColor.toLowerCase() === c.value.toLowerCase() ? 'border-gray-700 scale-110' : 'border-transparent',
                      )}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <label
                    title="Pick a custom color"
                    className="relative w-7 h-7 rounded-full border-2 border-gray-300 overflow-hidden cursor-pointer shrink-0"
                    style={{ background: isValidHex(config.accentColor) ? config.accentColor : '#ffffff' }}
                  >
                    <input
                      type="color"
                      value={isValidHex(config.accentColor) ? normalizeHex(config.accentColor) : '#000000'}
                      onChange={(e) => set('accentColor', e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </label>
                  <Input
                    value={config.accentColor}
                    onChange={(e) => {
                      const v = e.target.value.startsWith('#') || e.target.value === '' ? e.target.value : `#${e.target.value}`;
                      set('accentColor', v);
                    }}
                    placeholder="#1d4ed8"
                    maxLength={7}
                    spellCheck={false}
                    className={cn('w-28 font-mono', !isValidHex(config.accentColor) && 'border-red-400 focus-visible:ring-red-400')}
                  />
                  {!isValidHex(config.accentColor) && (
                    <span className="text-[11px] text-red-500">Invalid hex</span>
                  )}
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
                { key: 'showAddress',     label: 'Show address' },
                { key: 'showPhone',       label: 'Show phone' },
                { key: 'showWebsite',     label: 'Show website' },
                { key: 'showFawtaraQr',  label: 'Fawtara QR code' },
                { key: 'showItemizedTax', label: 'Itemized tax breakdown' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="font-normal text-gray-700">{label}</Label>
                  <Switch checked={config[key]} onCheckedChange={() => toggle(key)} />
                </div>
              ))}
              {needEn && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <Label>Footer message{bothLangs ? ' (English)' : ''}</Label>
                  <Input
                    value={config.footerText}
                    onChange={(e) => set('footerText', e.target.value)}
                    placeholder="e.g. Thank you for your purchase!"
                    maxLength={120}
                  />
                </div>
              )}
              {needAr && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <Label>Footer message{bothLangs ? ' (Arabic)' : ''}</Label>
                  <Input
                    dir="rtl"
                    value={config.footerTextAr}
                    onChange={(e) => set('footerTextAr', e.target.value)}
                    placeholder="مثال: شكراً لتسوقكم معنا!"
                    maxLength={120}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: preview + share (sticky so it stays visible while editing) ── */}
        <div className="w-80 flex-shrink-0 space-y-4 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto">
          {/* Preview-language toggle — only when issuing in both languages */}
          {bothLangs && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-[11px] text-gray-400">Preview:</span>
              <div className="inline-flex rounded-md border border-border bg-surface-page p-0.5">
                {(['en', 'ar'] as const).map((lng) => (
                  <button
                    key={lng}
                    onClick={() => setPreviewLang(lng)}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded transition-colors',
                      previewLang === lng ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    {lng === 'en' ? 'English' : 'العربية'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="rounded-xl overflow-hidden border border-border p-5"
            style={{ background: 'repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4 6px,#fafafa 6px,#fafafa 12px)' }}
          >
            {/* A4 templates (320px) are scaled to fit the 280px inner pane */}
            <div style={!isThermal ? { width: 280, overflow: 'hidden' } : undefined}>
              <div style={!isThermal ? { transform: 'scale(0.875)', transformOrigin: 'top left', width: 320 } : undefined}>
                <ReceiptPreview
                  orgName={orgInfo?.name ?? ''}
                  orgNameAr={config.orgNameAr}
                  taxNumber={taxNumber}
                  tagline={tagline}
                  taglineAr={taglineAr}
                  lang={effPreviewLang}
                  config={config}
                />
              </div>
            </div>
          </div>

          {/* Deliver card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deliver this receipt</p>
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface-page px-3 py-2">
                <span className="text-[11px] text-gray-500 truncate flex-1">{shareLink}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(shareLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                  className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                >
                  {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareLink)}`, '_blank')}>
                  <WhatsAppIcon size={12} />WhatsApp
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('Your receipt')}&body=${encodeURIComponent(shareLink)}`; }}>
                  <Mail size={12} />Email
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs col-span-2"
                  onClick={() => window.open(shareLink + '?download=1', '_blank')}>
                  <Download size={12} />Download PDF
                </Button>
              </div>
              {isThermal && (
                <Button className="w-full gap-2" size="sm" onClick={handleTestPrint} disabled={busy || !paired}>
                  <Printer size={13} />Print receipt
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
