'use client';

import { useEffect, useState } from 'react';
import { Info, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useServiceNotificationConfig, useUpdateServiceNotificationConfig } from '@/hooks/haraka';
import { useAdminGuard, toast } from '@/hooks/ui';
import { getReceiptBaseUrl } from '@/lib/app-env';

export default function ServiceNotificationSettingsPage() {
  const { isAllowed } = useAdminGuard('settingsServiceNotifications.view');
  const { data, isLoading } = useServiceNotificationConfig();
  const updateMut = useUpdateServiceNotificationConfig();

  const [whatsappEnabled,  setWhatsappEnabled]  = useState(false);
  const [phoneNumberId,    setPhoneNumberId]    = useState('');
  const [token,            setToken]            = useState('');
  const [webhookSecret,    setWebhookSecret]    = useState('');
  const [ocrApiKey,        setOcrApiKey]        = useState('');
  const [copied,           setCopied]           = useState(false);

  const config = data?.config;

  useEffect(() => {
    if (config) {
      setWhatsappEnabled(config.whatsappEnabled);
      setPhoneNumberId(config.whatsappPhoneNumberId ?? '');
    }
  }, [config]);

  if (!isAllowed) return null;

  const webhookUrl = `${getReceiptBaseUrl()}/api/whatsapp/webhook`;

  async function handleSave() {
    try {
      await updateMut.mutateAsync({
        whatsappEnabled,
        whatsappPhoneNumberId: phoneNumberId || null,
        whatsappToken:         token || undefined,
        whatsappWebhookSecret: webhookSecret || undefined,
        ocrApiKey:             ocrApiKey || undefined,
      });
      setToken('');
      setWebhookSecret('');
      setOcrApiKey('');
      toast.success('Notification settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Customer Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          WhatsApp updates sent to customers on service job status changes, and the plate-recognition provider used at intake.
          Keys entered here are encrypted at rest and never shown again — this is the only safe place to enter them.
        </p>
      </div>

      {/* ── WhatsApp ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Enable WhatsApp updates</Label>
            <p className="text-xs text-gray-400 mt-0.5">Sends status updates and the rating request directly to the customer</p>
          </div>
          <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
        </div>

        {whatsappEnabled && (
          <>
            <hr className="border-border" />
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              Get these from your Meta Business Manager → WhatsApp → API Setup, after completing business verification.
            </div>
            <div className="space-y-1.5">
              <Label>Phone number ID</Label>
              <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="1234567890" />
            </div>
            <div className="space-y-1.5">
              <Label>Permanent access token {config?.whatsappTokenSet && <span className="text-xs font-normal text-gray-400">(currently set — leave blank to keep)</span>}</Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={config?.whatsappTokenSet ? '••••••••' : 'Paste the System User permanent token'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Your webhook URL (paste into Meta App → Webhooks)</Label>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-xs bg-surface-inset" />
                <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Webhook verify token {config?.whatsappWebhookSecretSet && <span className="text-xs font-normal text-gray-400">(currently set)</span>}</Label>
              <Input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={config?.whatsappWebhookSecretSet ? '••••••••' : 'Same value you set as hub.verify_token in Meta'}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Plate OCR ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Plate recognition (FastPlateOCR)</h3>
        <div className="space-y-1.5">
          <Label>API key {config?.ocrApiKeySet && <span className="text-xs font-normal text-gray-400">(currently set — leave blank to keep)</span>}</Label>
          <Input
            type="password"
            value={ocrApiKey}
            onChange={(e) => setOcrApiKey(e.target.value)}
            placeholder={config?.ocrApiKeySet ? '••••••••' : 'From your FastPlateOCR dashboard'}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={updateMut.isPending}
          style={{ background: 'var(--mod-haraka)' }}
        >
          {updateMut.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
