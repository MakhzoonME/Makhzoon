'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrgInfo } from '@/hooks/org';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useT, useAdminGuard } from '@/hooks/ui';
import { toast } from '@/hooks/ui';
import { apiFetch } from '@/lib/utils/api-fetch';
import { ORG_CATEGORIES } from '@/types';
import { Check, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';

// Radix Select forbids an empty-string value, so we use a sentinel for "none"
// and map it back to '' (→ null on save).
const NONE_CATEGORY = '__none__';

const ACCENT_COLORS = [
  { value: '#1d4ed8', label: 'Indigo' },
  { value: '#0f766e', label: 'Teal' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#b91c1c', label: 'Red' },
  { value: '#000000', label: 'Black' },
];

const isValidHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
function normalizeHex(v: string) {
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return v;
}

export default function OrganizationInfoPage() {
  const { t } = useT();
  const { isAllowed } = useAdminGuard('settings.orgInfo');
  const { data: org, isLoading, isError } = useOrgInfo();
  const qc = useQueryClient();

  // ── Org info fields ──
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Branding fields (stored in receipt_config) ──
  const [logo, setLogo] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgNameAr, setOrgNameAr] = useState('');
  const [tagline, setTagline] = useState('');
  const [taglineAr, setTaglineAr] = useState('');
  const [phone, setPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [addressAr, setAddressAr] = useState('');
  const [website, setWebsite] = useState('');
  const [accentColor, setAccentColor] = useState('#1d4ed8');
  const [savingBranding, setSavingBranding] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: receiptSaved } = useQuery<{ tagline?: string; taglineAr?: string; taxNumber?: string; config?: ReceiptConfig }>({
    queryKey: ['receipt-config'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/receipt-config');
      return res.ok ? res.json() : {};
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (org) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(org.name ?? '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(org.category ?? '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContactEmail(org.contactEmail ?? '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDescription(org.description ?? '');
    }
  }, [org]);

  useEffect(() => {
    if (!receiptSaved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (receiptSaved.tagline !== undefined) setTagline(receiptSaved.tagline);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (receiptSaved.taglineAr !== undefined) setTaglineAr(receiptSaved.taglineAr);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (receiptSaved.taxNumber !== undefined) setTaxNumber(receiptSaved.taxNumber);
    if (receiptSaved.config) {
      const c = receiptSaved.config;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c.logo !== undefined) setLogo(c.logo);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c.orgName !== undefined) setOrgName(c.orgName);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c.orgNameAr !== undefined) setOrgNameAr(c.orgNameAr);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c.phone !== undefined) setPhone(c.phone);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c.address !== undefined) setAddress(c.address);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c.addressAr !== undefined) setAddressAr(c.addressAr);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c.website !== undefined) setWebsite(c.website);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c.accentColor) setAccentColor(c.accentColor);
    }
  }, [receiptSaved]);

  if (!isAllowed) return null;
  if (isLoading) return <LoadingSkeleton rows={5} columns={1} />;
  if (isError) return (
    <div className="max-w-[620px] mx-auto rounded-xl border border-border bg-surface-page p-8 text-center space-y-3">
      <p className="text-sm text-gray-500">{t('common.failed')}</p>
      <button onClick={() => qc.invalidateQueries({ queryKey: ['org-info-self'] })} className="text-sm text-primary-600 hover:underline">
        Retry
      </button>
    </div>
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/organizations/self', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: category || null, contactEmail, description }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to save');
      }
      toast.success(t('common.updated'));
      qc.invalidateQueries({ queryKey: ['org-info-self'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBranding() {
    setSavingBranding(true);
    try {
      const res = await fetch('/api/organizations/receipt-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagline,
          taglineAr,
          taxNumber,
          config: { logo, orgName, orgNameAr, phone, address, addressAr, website, accentColor },
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to save');
      toast.success(t('common.updated'));
      qc.invalidateQueries({ queryKey: ['receipt-config'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setSavingBranding(false);
    }
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
      setLogo(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    }
  }

  function handleReset() {
    if (org) {
      setName(org.name ?? '');
      setCategory(org.category ?? '');
      setContactEmail(org.contactEmail ?? '');
      setDescription(org.description ?? '');
    }
  }

  return (
    <div className="space-y-6 max-w-[620px] mx-auto">
      {/* ── Organization info ── */}
      <Card className="rounded-xl">
        <CardContent className="p-6">
          <h2 className="text-[17px] font-semibold text-gray-900 mb-5">{t('settings.orgName')}</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">{t('settings.orgName')} <span className="text-red-500">*</span></Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="org-category">{t('settings.category')}</Label>
                <Select
                  value={category || NONE_CATEGORY}
                  onValueChange={(v) => setCategory(v === NONE_CATEGORY ? '' : v)}
                >
                  <SelectTrigger id="org-category">
                    <SelectValue placeholder={t('settings.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_CATEGORY}>{t('settings.noneSelected')}</SelectItem>
                    {ORG_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-email">{t('settings.contactEmail')}</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-description">{t('settings.description')}</Label>
              <Textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('settings.descriptionPlaceholder')}
                rows={4}
                maxLength={1000}
              />
            </div>

            {org?.accountManager && (
              <div className="flex justify-between py-2.5 border-t border-border">
                <dt className="text-sm text-gray-500">{t('settings.accountManager')}</dt>
                <dd className="text-sm font-medium text-gray-900 text-end">
                  {org.accountManager.name
                    ? `${org.accountManager.name} (${org.accountManager.email})`
                    : org.accountManager.email}
                </dd>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                <Check aria-hidden className="h-4 w-4 me-1" strokeWidth={1.75} />
                {saving ? t('common.saving') : t('settings.saveChanges')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Branding (shared across receipt & invoice) ── */}
      <Card className="rounded-xl">
        <CardContent className="p-6 space-y-5">
          <div>
            <h2 className="text-[17px] font-semibold text-gray-900">Branding</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Shown on receipts and invoices — logo, name, contact details, and colors.
            </p>
          </div>

          {/* Logo */}
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {logo
                ? <img src={logo} alt="logo" className="w-12 h-12 object-contain border border-border rounded p-1 bg-white" />
                : <div className="w-12 h-12 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[9px] text-gray-400">LOGO</div>
              }
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                  <Upload size={13} className="me-1" />Upload
                </Button>
                {logo && (
                  <Button variant="outline" size="sm" onClick={() => setLogo(null)}>
                    <X size={13} />
                  </Button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>

          {/* Business names */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Business name (English)</Label>
              <Input
                placeholder={org?.name ?? 'Business name'}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                maxLength={80}
              />
              <p className="text-[11px] text-gray-400">Leave blank to use "{org?.name ?? '—'}".</p>
            </div>
            <div className="space-y-1.5">
              <Label>Business name (Arabic)</Label>
              <Input
                dir="rtl"
                placeholder="اسم المتجر"
                value={orgNameAr}
                onChange={(e) => setOrgNameAr(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>

          {/* Taglines */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tagline (English)</Label>
              <Input placeholder="e.g. Quality you can trust" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label>Tagline (Arabic)</Label>
              <Input dir="rtl" placeholder="جودة تثق بها" value={taglineAr} onChange={(e) => setTaglineAr(e.target.value)} maxLength={80} />
            </div>
          </div>

          {/* Phone + Tax number */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+962 6 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tax number</Label>
              <Input placeholder="123456789" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Address (English)</Label>
              <Input placeholder="123 Main Street, Amman" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Address (Arabic)</Label>
              <Input dir="rtl" placeholder="١٢٣ الشارع الرئيسي، عمّان" value={addressAr} onChange={(e) => setAddressAr(e.target.value)} />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input placeholder="www.example.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>

          {/* Accent color */}
          <div className="space-y-1.5">
            <Label>Accent color</Label>
            <div className="flex gap-2 items-center">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => setAccentColor(c.value)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-all',
                    accentColor.toLowerCase() === c.value.toLowerCase() ? 'border-gray-700 scale-110' : 'border-transparent',
                  )}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <label
                title="Pick a custom color"
                className="relative w-7 h-7 rounded-full border-2 border-gray-300 overflow-hidden cursor-pointer shrink-0"
                style={{ background: isValidHex(accentColor) ? accentColor : '#ffffff' }}
              >
                <input
                  type="color"
                  value={isValidHex(accentColor) ? normalizeHex(accentColor) : '#000000'}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
              <Input
                value={accentColor}
                onChange={(e) => {
                  const v = e.target.value.startsWith('#') || e.target.value === '' ? e.target.value : `#${e.target.value}`;
                  setAccentColor(v);
                }}
                placeholder="#1d4ed8"
                maxLength={7}
                spellCheck={false}
                className={cn('w-28 font-mono', !isValidHex(accentColor) && 'border-red-400 focus-visible:ring-red-400')}
              />
              {!isValidHex(accentColor) && (
                <span className="text-[11px] text-red-500">Invalid hex</span>
              )}
            </div>
          </div>

          <div className="pt-1">
            <Button onClick={handleSaveBranding} disabled={savingBranding}>
              <Check aria-hidden className="h-4 w-4 me-1" strokeWidth={1.75} />
              {savingBranding ? t('common.saving') : t('settings.saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
