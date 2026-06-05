'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WarrantyCertPreview } from '@/components/haraka/WarrantyCertPreview';
import { useWarrantyConfig, useUpdateWarrantyConfig } from '@/hooks/haraka';
import { useAdminGuard, toast } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import type { HarakaWarrantyConfig } from '@/types';

export default function WarrantyCertSettingsPage() {
  const { isAllowed } = useAdminGuard('settings.orgInfo');
  const { data, isLoading } = useWarrantyConfig();
  const updateMut = useUpdateWarrantyConfig();
  const { data: orgInfo } = useOrgInfo();

  const [cfg, setCfg] = useState<Partial<HarakaWarrantyConfig>>({
    defaultDurationDays: 180,
    language:    'en',
    template:    'a4-modern',
    accentColor: '#C2185B',
    showLogo:    true,
    showQr:      true,
    termsText:   null,
    termsTextAr: null,
    headerText:  null,
    headerTextAr:null,
    footerText:  null,
    footerTextAr:null,
  });

  useEffect(() => {
    if (data?.config) setCfg(data.config);
  }, [data]);

  if (!isAllowed) return null;

  const previewConfig: HarakaWarrantyConfig = {
    organizationId:      '',
    defaultDurationDays: cfg.defaultDurationDays ?? 180,
    termsText:    cfg.termsText    ?? null,
    termsTextAr:  cfg.termsTextAr  ?? null,
    headerText:   cfg.headerText   ?? null,
    headerTextAr: cfg.headerTextAr ?? null,
    footerText:   cfg.footerText   ?? null,
    footerTextAr: cfg.footerTextAr ?? null,
    showLogo:     cfg.showLogo     ?? true,
    showQr:       false, // no QR in preview (no real cert)
    language:     cfg.language     ?? 'en',
    template:     cfg.template     ?? 'a4-modern',
    accentColor:  cfg.accentColor  ?? '#C2185B',
  }

  async function handleSave() {
    try {
      await updateMut.mutateAsync({
        defaultDurationDays: cfg.defaultDurationDays,
        language:    cfg.language,
        template:    cfg.template,
        accentColor: cfg.accentColor,
        showLogo:    cfg.showLogo,
        showQr:      cfg.showQr,
        termsText:   cfg.termsText,
        termsTextAr: cfg.termsTextAr,
        headerText:  cfg.headerText,
        headerTextAr:cfg.headerTextAr,
        footerText:  cfg.footerText,
        footerTextAr:cfg.footerTextAr,
      })
      toast.success('Warranty certificate settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;

  return (
      <div className="flex gap-8 items-start">
        {/* ── Left: form ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Warranty Certificate</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure the customer-facing warranty document.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">General</h3>
          <div className="space-y-1.5">
            <Label>Default warranty duration (days)</Label>
            <Input type="number" min={1} max={3650}
              value={cfg.defaultDurationDays ?? 180}
              onChange={(e) => setCfg((c) => ({ ...c, defaultDurationDays: Number(e.target.value) }))}
              className="w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={cfg.language ?? 'en'} onValueChange={(v) => setCfg((c) => ({ ...c, language: v as 'en'|'ar'|'both' }))}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
                <SelectItem value="both">Bilingual (EN/AR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={cfg.template ?? 'a4-modern'} onValueChange={(v) => setCfg((c) => ({ ...c, template: v }))}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a4-modern">A4 Modern</SelectItem>
                <SelectItem value="a4-certificate">A4 Certificate</SelectItem>
                <SelectItem value="thermal-58">Thermal 58mm</SelectItem>
                <SelectItem value="thermal-80">Thermal 80mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Accent color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={cfg.accentColor ?? '#C2185B'}
                onChange={(e) => setCfg((c) => ({ ...c, accentColor: e.target.value }))}
                className="h-8 w-10 rounded cursor-pointer border border-border"
              />
              <Input value={cfg.accentColor ?? '#C2185B'} readOnly className="w-28 font-mono text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Show logo</Label>
            <Switch checked={cfg.showLogo ?? true} onCheckedChange={(v) => setCfg((c) => ({ ...c, showLogo: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show QR code</Label>
            <Switch checked={cfg.showQr ?? true} onCheckedChange={(v) => setCfg((c) => ({ ...c, showQr: v }))} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Text content</h3>
          <div className="space-y-1.5">
            <Label>Header (EN)</Label>
            <Input value={cfg.headerText ?? ''} onChange={(e) => setCfg((c) => ({ ...c, headerText: e.target.value || null }))} placeholder="e.g. Official Warranty Document" />
          </div>
          <div className="space-y-1.5">
            <Label>Header (AR)</Label>
            <Input dir="rtl" value={cfg.headerTextAr ?? ''} onChange={(e) => setCfg((c) => ({ ...c, headerTextAr: e.target.value || null }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Terms & Conditions (EN)</Label>
            <Textarea rows={4} value={cfg.termsText ?? ''} onChange={(e) => setCfg((c) => ({ ...c, termsText: e.target.value || null }))} placeholder="Enter warranty terms…" />
          </div>
          <div className="space-y-1.5">
            <Label>Terms & Conditions (AR)</Label>
            <Textarea dir="rtl" rows={4} value={cfg.termsTextAr ?? ''} onChange={(e) => setCfg((c) => ({ ...c, termsTextAr: e.target.value || null }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Footer (EN)</Label>
            <Input value={cfg.footerText ?? ''} onChange={(e) => setCfg((c) => ({ ...c, footerText: e.target.value || null }))} placeholder="Footer note or disclaimer" />
          </div>
          <div className="space-y-1.5">
            <Label>Footer (AR)</Label>
            <Input dir="rtl" value={cfg.footerTextAr ?? ''} onChange={(e) => setCfg((c) => ({ ...c, footerTextAr: e.target.value || null }))} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateMut.isPending} style={{ background: 'var(--mod-haraka)' }}>
          {updateMut.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>

      {/* ── Right: live preview ────────────────────────────────────── */}
      <div className="flex-1 min-w-[520px] sticky top-6 self-start">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Preview</p>
        <div
          className="rounded-xl overflow-hidden border border-border p-4 overflow-y-auto max-h-[80vh]"
          style={{ background: 'repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4 6px,#fafafa 6px,#fafafa 12px)' }}
        >
          <div className="flex justify-center">
            <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: 640 }}>
              <WarrantyCertPreview
                config={previewConfig}
                orgName={orgInfo?.name ?? 'Your Business'}
                lang={cfg.language === 'ar' ? 'ar' : 'en'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
